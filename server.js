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
     UPDATE STATS EVERY 5 SECONDs
  ========================== */
  const interval = setInterval(sendDashboardStats, 1000);

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
  sendDashboardStats();
  sendFilterOptions(socket);


  /* ==========================
   RECENT APPOINTMENTS
========================== */
  socket.on("getRecentAppointments", ({ page, limit }) => {
    const offset = (page - 1) * limit;

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
      ORDER BY a.appointment_date DESC
      
      LIMIT ? OFFSET ?
      `,
      [limit, offset],
      (err, rows) => {
        if (err) return;

        // get total count (for total pages)
        db.query(
          `SELECT COUNT(*) AS total FROM appointments WHERE status = 'completed'`,
          (err2, countResult) => {
            if (err2) return;

            socket.emit("recentAppointments", {
              rows,
              total: countResult[0].total
            });
          }
        );
      }
    );
  });



  socket.on("getStatDetailsPaginated", ({ type, page, limit }) => {

    let dataQuery = "";
    let countQuery = "";
    let title = "";

    const offset = (page - 1) * limit;

    switch (type) {

      case "total-customer":
        title = "Total Customers";
        dataQuery = `
        SELECT name
        FROM customers
        ORDER BY name ASC
        LIMIT ? OFFSET ?
      `;
        countQuery = `SELECT COUNT(*) AS total FROM customers`;
        break;

      case "total-appointments":
        title = "Total Appointments";
        dataQuery = `
        SELECT 
          c.name AS customer,
          a.appointment_date,
          a.status
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        ORDER BY a.appointment_date DESC
        LIMIT ? OFFSET ?
      `;
        countQuery = `SELECT COUNT(*) AS total FROM appointments`;
        break;

      case "upcoming-today":
        title = "Upcoming Today";
        dataQuery = `
        SELECT 
          c.name AS customer,
          a.appointment_date
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        WHERE a.appointment_date = CURDATE()
        ORDER BY a.appointment_date ASC
        LIMIT ? OFFSET ?
      `;
        countQuery = `
        SELECT COUNT(*) AS total
        FROM appointments
        WHERE appointment_date = CURDATE()
      `;
        break;

      case "pending-approval":
        title = "Pending Approvals";
        dataQuery = `
        SELECT 
          c.name AS customer,
          a.appointment_date,
          a.status
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        WHERE a.status = 'pending'
        ORDER BY a.appointment_date DESC
        LIMIT ? OFFSET ?
      `;
        countQuery = `
        SELECT COUNT(*) AS total
        FROM appointments
        WHERE status = 'pending'
      `;
        break;

      default:
        return;
    }

    db.query(countQuery, (err, countResult) => {
      if (err) return console.error(err);

      const total = countResult[0].total;

      db.query(dataQuery, [limit, offset], (err2, rows) => {
        if (err2) return console.error(err2);

        socket.emit("statDetailsPaginated", {
          title,
          rows,
          total
        });
      });
    });
  });




  socket.on("disconnect", () => {
    clearInterval(interval);
    console.log("Socket disconnected:", socket.id);
  });
});

app.get("*", (req, res) =>
  res.sendFile(__dirname + "/public/index.html")
);

http.listen(3000, () =>
  console.log("Server running on port 3000")
);
