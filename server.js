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

    db.query("SELECT COUNT(DISTINCT name) AS total FROM customers", (e, r) => {
      stats.totalClients = r?.[0]?.total ?? 0;

      db.query("SELECT COUNT(*) AS total FROM appointments", (e2, r2) => {
        stats.totalAppointments = r2?.[0]?.total ?? 0;

        db.query(
          "SELECT COUNT(DISTINCT customer_id) AS total FROM appointments WHERE appointment_date = CURDATE()",
          (e3, r3) => {
            stats.upcomingToday = r3?.[0]?.total ?? 0;

            db.query(
              "SELECT COUNT(*) AS total FROM appointments WHERE status = 'pending'",
              (e4, r4) => {
                stats.pendingApproval = r4?.[0]?.total ?? 0;

                // emit full stats
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
  SELECT DAY(appointment_date) AS day,
         COUNT(DISTINCT customer_id) AS total
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
  sendDashboardStats();


  /* ==========================
     SEND STATS ON CONNECT
  ========================== */
  sendFilterOptions(socket);


  /* ==========================
   RECENT APPOINTMENTS
========================== */
  socket.on("getRecentAppointments", () => {

    db.query(`
    SELECT 
      c.name AS customer,
      a.appointment_date AS date,
      a.status
    FROM appointments a
    JOIN customers c ON a.customer_id = c.id
    WHERE a.status = 'completed'
    ORDER BY a.appointment_date DESC
    LIMIT 5
  `, (err, rows) => {

      if (err) {
        console.error(err);
        return;
      }

      socket.emit("recentAppointments", rows);
    });

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
        title = "Total Clients";
        dataQuery = `
        SELECT DISTINCT id, name
        FROM customers
        WHERE name LIKE ?
        ORDER BY name ASC
        LIMIT ? OFFSET ?

      `;
        countQuery = `
        SELECT COUNT(DISTINCT name) AS total
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
          c.id,
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
        SELECT c.id, c.name, a.appointment_date
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
        SELECT c.id, c.name, a.status
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
      WHERE a.status = 'pending'
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
      io.emit("appointmentUpdate");
    });
  });

  socket.on("deleteAllAppointments", () => {
    db.query("DELETE FROM appointments", (err) => {
      if (err) console.error(err);
      io.emit("appointmentUpdate");
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









// FOR ADDING CUSTOMERS
app.post("/page/add-customer-data", (req, res) => {
  const {
    customer_id,
    name,
    contact,
    address,
    email,
    customer_type,
    notes,
    purpose,
    date,
    time,
    meeting_mode,
    status,
    appointment_note
  } = req.body;

  if (!name || !contact || !purpose || !date || !time) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const insertAppointmentFlow = (customerId) => {
    // 1. Insert into appointments
    const appointmentQuery = `
      INSERT INTO appointments
      (customer_id, appointment_date, appointment_time, status)
      VALUES (?, ?, ?, ?)
    `;

    db.query(
      appointmentQuery,
      [customerId, date, time, status || "pending"],
      (err2, appointmentResult) => {
        if (err2) {
          console.error("Appointment insert error:", err2);
          return res.status(500).json({ message: "Failed to insert appointment" });
        }

        const appointmentId = appointmentResult.insertId;

        // 2. Insert into appointment_details
        const detailsQuery = `
          INSERT INTO appointment_details
          (appointment_id, purpose, meeting_mode)
          VALUES (?, ?, ?)
        `;

        db.query(
          detailsQuery,
          [appointmentId, purpose, meeting_mode || "walk-in"],
          (err3) => {
            if (err3) {
              console.error("Appointment details insert error:", err3);
              return res.status(500).json({ message: "Failed to insert appointment details" });
            }

            // 3. Insert into appointment_status
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
                  return res.status(500).json({ message: "Failed to insert appointment status" });
                }

                // 4. Insert note if exists
                if (appointment_note && appointment_note.trim() !== "") {
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
                        return res.status(500).json({ message: "Failed to insert appointment note" });
                      }

                      io.emit("appointmentUpdate");
                      return res.json({ message: "Customer & appointment saved successfully" });
                    }
                  );
                } else {
                  // no note
                  io.emit("appointmentUpdate");
                  return res.json({ message: "Customer & appointment saved successfully" });
                }
              }
            );
          }
        );
      }
    );
  };

  // ================================
  // MAIN LOGIC
  // ================================

  // ================================
  // MAIN LOGIC (safer for external customers)
  // ================================

  const insertOrGetCustomerId = () => {
    db.query(
      "SELECT id FROM customers WHERE name = ? LIMIT 1",
      [name],
      (err, rows) => {
        if (err) return res.status(500).json({ message: "DB error" });

        if (rows.length > 0) {
          // Existing customer
          insertAppointmentFlow(rows[0].id);
        } else {
          // Insert new customer
          db.query(
            `INSERT INTO customers (name, contact, address, email, customer_type)
           VALUES (?, ?, ?, ?, ?)`,
            [name, contact, address || "", email || "", customer_type || "New"],
            (err2, result) => {
              if (err2) return res.status(500).json({ message: "Customer insert failed" });

              insertAppointmentFlow(result.insertId);
            }
          );
        }
      }
    );
  };

  insertOrGetCustomerId();



  // Use the function
  // insertOrGetCustomerId(customer_id, name, contact, address, email, customer_type, (finalCustomerId, err) => {
  //   if (err) return res.status(500).json({ message: "Failed to insert customer" });

  //   insertAppointmentFlow(finalCustomerId); // safe now
  // });

});


app.get("/page/customers", (req, res) => {
  const search = req.query.search || "";

  const query = `
    SELECT min(id) as id, name, contact
    FROM customers
    WHERE name LIKE ?
    GROUP BY name, contact
    ORDER BY name ASC
    LIMIT 20;
  `;

  db.query(query, [`%${search}%`], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json([]);
    }
    res.json(rows);
  });
});




app.get("*", (req, res) =>
  res.sendFile(__dirname + "/public/index.html")
);

http.listen(3000, () =>
  console.log("Server running on port 3000")
);
