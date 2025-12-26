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
     SEND STATS ON CONNECT
  ========================== */
  sendDashboardStats();

  /* ==========================
     UPDATE STATS EVERY 2 MILLISECONDS
  ========================== */
  const interval = setInterval(sendDashboardStats, 1000);

  /* ==========================
     FILTER DASHBOARD (CHART ONLY)
  ========================== */
  socket.on("filterDashboard", ({ year, month, week }) => {
    const startDay = (week - 1) * 7 + 1;
    const endDay = Math.min(
      week * 7,
      new Date(year, month, 0).getDate()
    );

    db.query(
      `
      SELECT DAYOFWEEK(appointment_date) AS day,
             COUNT(*) AS total
      FROM appointments
      WHERE YEAR(appointment_date) = ?
        AND MONTH(appointment_date) = ?
        AND DAY(appointment_date) BETWEEN ? AND ?
      GROUP BY day
      `,
      [year, month, startDay, endDay],
      (err, rows) => {
        if (err) return;

        const weekData = [0, 0, 0, 0, 0, 0, 0];
        rows.forEach(r => {
          weekData[r.day - 1] = r.total;
        });

        // CHART DATA ONLY
        socket.emit("dashboardChart", { weekData });
      }
    );
  });

  /* ==========================
     FILTER OPTIONS
  ========================== */
  db.query(
    `
    SELECT YEAR(appointment_date) AS year,
           MONTH(appointment_date) AS month,
           DAY(appointment_date) AS day
    FROM appointments
    GROUP BY year, month, day
    ORDER BY year DESC, month ASC, day ASC
    `,
    (err, rows) => {
      if (err) return;

      const filters = {
        years: [...new Set(rows.map(r => r.year))],
        months: {},
        weeks: {}
      };

      rows.forEach(r => {
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

      socket.emit("filterOptions", filters);
    }
  );

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
      ORDER BY a.appointment_date DESC
      WHERE a.status = 'completed'
      LIMIT ? OFFSET ?
      `,
      [limit, offset],
      (err, rows) => {
        if (err) return;

        // get total count (for total pages)
        db.query(
          `SELECT COUNT(*) AS total FROM appointments`,
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

  // sendRecentAppointments();

  // const recentInterval = setInterval(sendRecentAppointments, 1000);


  socket.on("disconnect", () => {
    clearInterval(interval);
    // clearInterval(recentInterval);
    console.log("Socket disconnected:", socket.id);
  });
});

app.get("*", (req, res) =>
  res.sendFile(__dirname + "/public/index.html")
);

http.listen(3000, () =>
  console.log("Server running on port 3000")
);
