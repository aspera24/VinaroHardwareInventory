module.exports = (io) => {
  const express = require("express");
  const router = express.Router();
  const db = require("../config/db.config");

  // FOR ADDING CUSTOMERS
  router.post("/page/add-customer-data", (req, res) => {
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
      appointment_note,
      uID
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
              (appointment_id, status, inserted_by)
              VALUES (?, ?, ?)
            `;

              db.query(
                statusQuery,
                [appointmentId, status || "pending", uID],
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



  router.get("/page/customers", (req, res) => {
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




  // For void 
  router.put("/page/dashboard/update-status/:id", (req, res) => {

    const { id } = req.params;
    const { status } = req.body;

    console.log("Updating appointment:", id, "to", status);

    db.query(
      "UPDATE appointments SET status = ? WHERE id = ?",
      [status, id],
      (err) => {

        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Database error" });
        }

        db.query(
          "UPDATE appointment_status SET status = ? WHERE appointment_id = ?",
          [status, id]
        );

        res.json({ message: "Status updated successfully" });

      }
    );

  });



  router.put("/:username/page/appointments/update-data/:id", (req, res) => {
    const { id } = req.params;
    const { date, time, status, purpose, note, contact } = req.body;

    db.query(
      "SELECT customer_id FROM appointments WHERE id=?",
      [id],
      (err, rows) => {

        if (err) return res.status(500).json({ message: "Failed to get customer" });

        const customerId = rows[0].customer_id;

        db.query(
          "UPDATE customers SET contact=? WHERE id=?",
          [contact, customerId]
        );


        // Update main appointments
        db.query(
          `UPDATE appointments 
     SET appointment_date=?, appointment_time=?, status=? 
     WHERE id=?`,
          [date, time, status, id],
          (err) => {
            if (err) return res.status(500).json({ message: "Failed to update appointment" });

            // Update details
            db.query(
              `UPDATE appointment_details 
         SET purpose=? 
         WHERE appointment_id=?`,
              [purpose, id],
              (err2) => {
                if (err2) return res.status(500).json({ message: "Failed to update purpose" });

                // Handle notes safely
                const handleNote = () => {
                  // Update status table and send response
                  db.query(
                    `UPDATE appointment_status 
               SET status=?, updated_at=NOW()
               WHERE appointment_id=?`,
                    [status, id],
                    (err4) => {
                      if (err4) return res.status(500).json({ message: "Failed to update status" });

                      // Only send response here once
                      res.json({ message: "Appointment updated successfully" });
                    }
                  );
                };

                // Check if input note is empty
                if (!note || note.trim() === "") {
                  // If input is empty, check if there’s an existing note
                  db.query(
                    `SELECT id FROM appointment_notes WHERE appointment_id=?`,
                    [id],
                    (errCheck, rows) => {
                      if (errCheck) return res.status(500).json({ message: "Failed to check note" });

                      if (rows.length > 0) {
                        // Delete existing note if any
                        db.query(
                          `DELETE FROM appointment_notes WHERE appointment_id=?`,
                          [id],
                          (errDelete) => {
                            if (errDelete) return res.status(500).json({ message: "Failed to delete note" });
                            handleNote();
                          }
                        );
                      } else {
                        // No note to delete
                        handleNote();
                      }
                    }
                  );
                } else {
                  // Input is not empty → insert or update
                  db.query(
                    `SELECT id FROM appointment_notes WHERE appointment_id=?`,
                    [id],
                    (err3, rows) => {
                      if (err3) return res.status(500).json({ message: "Failed to check note" });

                      if (rows.length > 0) {
                        // Update existing note
                        db.query(
                          `UPDATE appointment_notes SET note=? WHERE appointment_id=?`,
                          [note, id],
                          (errUpdate) => {
                            if (errUpdate) return res.status(500).json({ message: "Failed to update note" });
                            handleNote();
                          }
                        );
                      } else {
                        // Insert new note
                        db.query(
                          `INSERT INTO appointment_notes (appointment_id, note) VALUES (?, ?)`,
                          [id, note],
                          (errInsert) => {
                            if (errInsert) return res.status(500).json({ message: "Failed to insert note" });
                            handleNote();
                          }
                        );
                      }
                    }
                  );
                }
              }
            );
          }
        );

      }
    );
  });





  router.get("/page/appointment/:id", (req, res) => {
    const { id } = req.params;

    const query = `
      SELECT 
        a.id,
        a.customer_id,
        c.name AS customer_name,
        c.contact,
        a.appointment_date,
        a.appointment_time,
        a.status,
        ad.purpose,
        an.note,
        ad.created_at,
        aps.updated_at
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      LEFT JOIN appointment_details ad ON ad.appointment_id = a.id
      LEFT JOIN appointment_notes an ON an.appointment_id = a.id
      LEFT JOIN appointment_status aps ON aps.appointment_id = a.id
      WHERE a.id = ?
    `;

    db.query(query, [id], (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Database error" });
      }

      if (!rows.length) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      res.json(rows[0]); // send combined object
    });
  });


  return router
};