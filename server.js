const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const db = require("./db");

app.use(express.json());
app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  /* ==========================
     DASHBOARD STATS FUNCTION
  ========================== */
  const sendDashboardStats = () => {
    const stats = {};

    db.query("SELECT COUNT(*) AS total FROM customers", (e, r) => {
      if (e) return;
      stats.totalCustomers = r[0].total;

      db.query("SELECT COUNT(*) AS total FROM appointments", (e2, r2) => {
        if (e2) return;
        stats.totalAppointments = r2[0].total;

        db.query(
          "SELECT COUNT(*) AS total FROM appointments WHERE appointment_date = CURDATE()",
          (e3, r3) => {
            if (e3) return;
            stats.upcomingToday = r3[0].total;

            db.query(
              "SELECT COUNT(*) AS total FROM appointments WHERE status = 'pending'",
              (e4, r4) => {
                if (e4) return;
                stats.pendingApproval = r4[0].total;

                // ONE EMIT = FULL STATS
                socket.emit("dashboardStats", stats);
              }
            );
          }
        );
      });
    });
  };


  /* ==========================
     FILTER DASHBOARD (CHART ONLY)
  ========================== */
  socket.on("filterDashboard", ({ year, month, week }) => {
    const startDay = (week - 1) * 7 + 1;
    const monthEnd = new Date(year, month, 0).getDate();
    const endDay = Math.min(week * 7, monthEnd);

    db.query(
      `
    SELECT DAY(DATE(appointment_date)) AS day,
           COUNT(*) AS total
    FROM appointments
    WHERE YEAR(appointment_date) = ?
      AND MONTH(appointment_date) = ?
      AND DAY(appointment_date) BETWEEN ? AND ?
    GROUP BY day
    ORDER BY day
    `,
      [year, month, startDay, endDay],
      (err, rows) => {
        if (err) return console.error(err);

        // Initialize array with zeros
        const weekData = [];
        for (let d = startDay; d <= endDay; d++) {
          const row = rows.find(r => r.day === d);
          weekData.push(row ? row.total : 0);
        }

        socket.emit("dashboardChart", { weekData });
      }
    );
  });



  /* ==========================
     FILTER OPTIONS
  ========================== */
  const sendFilterOptions = (targetSocket = io) => {
    db.query(
      `
    SELECT 
      YEAR(appointment_date) AS year,
      MONTH(appointment_date) AS month,
      DAY(appointment_date) AS day
    FROM appointments
    GROUP BY year, month, day
    ORDER BY year DESC, month ASC, day ASC
    `,
      (err, rows) => {
        if (err) return console.error(err);

        const filters = {
          years: [],
          months: {},
          weeks: {}
        };

        rows.forEach(r => {
          if (!filters.years.includes(r.year)) {
            filters.years.push(r.year);
          }

          if (!filters.months[r.year]) filters.months[r.year] = new Set();
          filters.months[r.year].add(r.month);

          const weekNum = Math.floor((r.day - 1) / 7) + 1;
          const key = `${r.year}-${r.month}`;
          if (!filters.weeks[key]) filters.weeks[key] = new Set();
          filters.weeks[key].add(weekNum);
        });

        for (let y in filters.months)
          filters.months[y] = [...filters.months[y]];

        for (let k in filters.weeks)
          filters.weeks[k] = [...filters.weeks[k]];

        targetSocket.emit("filterOptions", filters);
      }
    );
  };


  let lastMaxDate = null;

  const watchDatabase = () => {
    db.query(
      `SELECT MAX(appointment_date) AS maxDate FROM appointments`,
      (err, r) => {
        if (err) return;

        const currentMaxDate = r[0].maxDate;

        if (currentMaxDate !== lastMaxDate) {
          lastMaxDate = currentMaxDate;

          sendDashboardStats();
          sendFilterOptions(io);

          io.emit("databaseUpdated");
        }
      }
    );
  };

  // check every 1 second
  setInterval(watchDatabase, 1000);


  /* ==========================
     SEND STATS ON CONNECT
  ========================== */
  sendFilterOptions(socket);


  /* ==========================
   RECENT APPOINTMENTS
========================== */
  socket.on("getRecentAppointments", ({ page, limit, search }) => {
    const offset = (page - 1) * limit;

    let searchQuery = "";
    let params = [];

    if (search && search.trim() !== "") {
      searchQuery = "AND c.name LIKE ?";
      params.push(`%${search}%`);
    }

    // get paginated data
    db.query(
      `
    SELECT 
      c.name AS customer,
      a.appointment_date AS date,
      a.status
    FROM appointments a
    JOIN customers c ON a.customer_id = c.id
    WHERE a.status = 'completed'
    ${searchQuery}
    ORDER BY a.appointment_date DESC
    LIMIT ? OFFSET ?
    `,
      [...params, limit, offset],
      (err, rows) => {
        if (err) {
          console.error(err);
          return;
        }

        // get total count (for total pages)
        db.query(
          `
        SELECT COUNT(*) AS total 
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        WHERE a.status = 'completed'
        ${searchQuery}
        `,
          params,
          (err2, countResult) => {
            if (err2) {
              console.error(err2);
              return;
            }

            socket.emit("recentAppointments", {
              rows,
              total: countResult[0].total
            });
          }
        );
      }
    );
  });




  socket.on("getStatDetailsPaginated", ({
    type,
    page,
    limit,
    search = "",
    status = ""
  }) => {

    let dataQuery = "";
    let countQuery = "";
    let title = "";
    let params = [];
    let countParams = [];

    const offset = (page - 1) * limit;
    const searchLike = `%${search}%`;

    switch (type) {

      // TOTAL CUSTOMERS
      case "total-customer":
        title = "Total Customers";
        dataQuery = `
        SELECT name
        FROM customers
        WHERE name LIKE ?
        ORDER BY name ASC
        LIMIT ? OFFSET ?
      `;
        countQuery = `
        SELECT COUNT(*) AS total
        FROM customers
        WHERE name LIKE ?
      `;
        params = [searchLike, limit, offset];
        countParams = [searchLike];
        break;

      // TOTAL APPOINTMENTS (with STATUS FILTER)
      case "total-appointments":
        title = "Total Appointments";

        let statusFilter = "";
        if (status) {
          statusFilter = "AND a.status = ?";
        }

        dataQuery = `
        SELECT 
          c.name,
          a.appointment_date,
          a.status
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        WHERE c.name LIKE ?
        ${statusFilter}
        ORDER BY a.appointment_date DESC
        LIMIT ? OFFSET ?
      `;

        countQuery = `
        SELECT COUNT(*) AS total
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        WHERE c.name LIKE ?
        ${statusFilter}
      `;

        params = status
          ? [searchLike, status, limit, offset]
          : [searchLike, limit, offset];

        countParams = status
          ? [searchLike, status]
          : [searchLike];

        break;

      // UPCOMING TODAY
      case "upcoming-today":
        title = "Upcoming Today";
        dataQuery = `
        SELECT c.name, a.appointment_date
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        WHERE DATE(a.appointment_date) = CURDATE()
        AND c.name LIKE ?
        ORDER BY a.appointment_date ASC
        LIMIT ? OFFSET ?
      `;
        countQuery = `
        SELECT COUNT(*) AS total
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        WHERE DATE(a.appointment_date) = CURDATE()
        AND c.name LIKE ?
      `;
        params = [searchLike, limit, offset];
        countParams = [searchLike];
        break;

      // PENDING APPROVAL
      case "pending-approval":
        title = "Pending Approvals";
        dataQuery = `
        SELECT c.name, a.status
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        WHERE a.status = 'pending'
        AND c.name LIKE ?
        ORDER BY c.name ASC
        LIMIT ? OFFSET ?
      `;
        countQuery = `
        SELECT COUNT(*) AS total
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        WHERE a.status = 'pending'
        AND c.name LIKE ?
      `;
        params = [searchLike, limit, offset];
        countParams = [searchLike];
        break;

      default:
        return;
    }

    db.query(countQuery, countParams, (err, countResult) => {
      if (err) return console.error(err);

      const total = countResult[0].total;

      db.query(dataQuery, params, (err2, rows) => {
        if (err2) return console.error(err2);

        socket.emit("statDetailsPaginated", {
          title,
          rows,
          total,
          type
        });
      });
    });
  });

  /* ==========================
   GET ALL APPOINTMENTS (SOCKET)
========================== */
  socket.on("getAppointments", () => {

    const query = `
      SELECT 
        a.id,
        c.name,
        ad.purpose,
        DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS date,
        a.appointment_time AS time,
        a.status,
        an.note
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      JOIN appointment_details ad ON ad.appointment_id = a.id
      LEFT JOIN appointment_notes an ON an.appointment_id = a.id
      ORDER BY a.appointment_date DESC, a.appointment_time DESC;
  `;

    db.query(query, (err, rows) => {
      if (err) {
        console.error("Fetch appointments error:", err);
        socket.emit("appointmentsData", []);
        return;
      }

      socket.emit("appointmentsData", rows);
    });
  });

  socket.on("deleteAppointment", (id) => {
    db.query("DELETE FROM appointments WHERE id = ?", [id], (err) => {
      if (err) console.error(err);
      io.emit("databaseUpdated");
    });
  });

  socket.on("deleteAllAppointments", () => {
    db.query("DELETE FROM appointments", (err) => {
      if (err) console.error(err);
      io.emit("databaseUpdated");
    });
  });

  socket.on("getSingleAppointment", (id) => {
    db.query("SELECT * FROM appointments WHERE id = ?", [id], (err, rows) => {
      if (err) {
        socket.emit("singleAppointmentData", null);
      } else {
        socket.emit("singleAppointmentData", rows[0]);
      }
    });
  });



  socket.on("disconnect", () => {
    // clearInterval(interval);
    console.log("Socket disconnected:", socket.id);
  });
});


// For Adding-Customer
app.post("/api/add-customer", (req, res) => {
  const {
    name,
    contact,
    address,
    email,
    customer_type,
    notes,
    purpose,
    amount,
    date,
    time,
    meeting_mode,
    status,
    appointment_note
  } = req.body;

  // check required fields
  if (!name || !contact || !purpose || !amount || !date || !time) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Insert into customers table
  const customerQuery = `
    INSERT INTO customers
    (name, contact, address, email, customer_type, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    customerQuery,
    [
      name,
      contact,
      address || "",
      email || "",
      customer_type || "new",
      notes || ""
    ],
    (err, customerResult) => {
      if (err) {
        console.error("Customer insert error:", err);
        return res.status(500).json({ message: "Failed to insert customer" });
      }

      const customerId = customerResult.insertId;

      //Insert into appointments table
      const appointmentQuery = `
        INSERT INTO appointments
        (customer_id, appointment_date, appointment_time, status)
        VALUES (?, ?, ?, ?)
      `;

      db.query(
        appointmentQuery,
        [customerId, date, time, status],
        (err2, appointmentResult) => {
          if (err2) {
            console.error("Appointment insert error:", err2);
            return res.status(500).json({ message: "Failed to insert appointment" });
          }

          const appointmentId = appointmentResult.insertId;

          // Insert into appointment_details table
          const detailsQuery = `
            INSERT INTO appointment_details
            (appointment_id, purpose, amount, meeting_mode)
            VALUES (?, ?, ?, ?)
          `;

          db.query(
            detailsQuery,
            [appointmentId, purpose, amount, meeting_mode || "walk-in"],
            (err3) => {
              if (err3) {
                console.error("Appointment details insert error:", err3);
                return res.status(500).json({ message: "Failed to insert appointment details" });
              }

              // Insert into appointment_status table
              const statusQuery = `
                INSERT INTO appointment_status
                (appointment_id, status)
                VALUES (?, ?)
              `;

              db.query(
                statusQuery,
                [appointmentId, status || "pending"],
                (err4) => {
                  if (err4) {
                    console.error("Appointment status insert error:", err4);
                    return res.status(500).json({ message: "Failed to insert status" });
                  }

                  // Insert note if exists
                  if (appointment_note) {
                    const notesQuery = `
                      INSERT INTO appointment_notes
                      (appointment_id, note)
                      VALUES (?, ?)
                    `;

                    db.query(
                      notesQuery,
                      [appointmentId, appointment_note],
                      (err5) => {
                        if (err5) {
                          console.error("Appointment notes insert error:", err5);
                          return res.status(500).json({ message: "Failed to insert note" });
                        }

                        // Notify dashboard via socket.io
                        io.emit("databaseUpdated");

                        return res.json({ message: "Customer & appointment saved successfully" });
                      }
                    );
                  } else {
                    // no note
                    io.emit("databaseUpdated");
                    return res.json({ message: "Customer & appointment saved successfully" });
                  }
                }
              );
            }
          );
        }
      );
    }
  );
});


app.get("*", (req, res) =>
  res.sendFile(__dirname + "/public/index.html")
);

http.listen(3000, () =>
  console.log("Server running on port 3000")
);
