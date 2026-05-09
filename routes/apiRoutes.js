module.exports = (io) => {
  const express = require("express");
  const router = express.Router();
  const db = require("../config/db.config");
  const requireAuth = require("../middleware/authMiddleware");
  const multer = require("multer");
  const upload = multer({ storage: multer.memoryStorage() });

  // GET borrowers
  router.get("/borrower", requireAuth, (req, res) => {

    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 6;

    let search = req.query.search || "";

    let offset = (page - 1) * limit;

    db.query(
      `
      SELECT *
      FROM borrowers
      WHERE name LIKE ?
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `,
      [`%${search}%`, limit, offset],
      (err, result) => {
        if (err) return res.status(500).json(err);

        const formatted = result.map(r => {
          if (r.profile) {
            r.profile = `data:image/jpeg;base64,${r.profile.toString("base64")}`;
          }
          return r;
        });

        res.json(formatted);
      }
    );
  });

  // GET borrowers count
  router.get("/borrower/count", requireAuth, (req, res) => {
    db.query("SELECT COUNT(*) AS total FROM borrowers", (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result[0]);
    });
  });

  // DELETE borrower(s)
  router.post("/borrower/delete", async (req, res) => {
    try {
      const { ids } = req.body;

      if (!ids || ids.length === 0) {
        return res.status(400).json({ message: "No IDs provided" });
      }

      const placeholders = ids.map(() => "?").join(",");

      const sql = `DELETE FROM borrowers WHERE id IN (${placeholders})`;

      await db.execute(sql, ids);

      res.json({ message: "Borrower(s) deleted successfully" });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // GET SINGLE BORROWER
  router.get("/borrower/:id", requireAuth, (req, res) => {
    const { id } = req.params;

    db.query(
      "SELECT * FROM borrowers WHERE id = ?",
      [id],
      (err, result) => {
        if (err) return res.status(500).json(err);

        if (result.length === 0) {
          return res.status(404).json({ message: "Borrower not found" });
        }

        const row = result[0];

        // convert image to base64
        if (row.profile) {
          row.profile = `data:image/jpeg;base64,${row.profile.toString("base64")}`;
        }

        res.json(row);
      }
    );
  });

  // UPDATE borrower's data
  router.post("/borrower/update", upload.single("profile"), async (req, res) => {
    try {
      const { id, name, contact } = req.body;
      const file = req.file;

      if (!id || !name) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      let sql = "UPDATE borrowers SET name = ?, contact = ?";
      let params = [name || null, contact || null];

      if (file) {
        const compressedImage = await sharp(file.buffer)
          .resize(500, 500)
          .jpeg({ quality: 80 })
          .toBuffer();

        sql += ", profile = ?";
        params.push(compressedImage);
      }

      sql += " WHERE id = ?";
      params.push(id);

      await db.execute(sql, params);

      res.json({ message: "Borrower updated successfully" });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });


  // ADD BORROWER
  const sharp = require("sharp");

  router.post("/borrowers", requireAuth, upload.single("profile"), async (req, res) => {
    try {
      const { name, contact } = req.body;
      const adminId = req.session.adminId;

      let compressedImage = null;

      if (req.file) {
        compressedImage = await sharp(req.file.buffer)
          .resize(500, 500)
          .jpeg({ quality: 80 })
          .toBuffer();
      }

      db.query(
        "INSERT INTO borrowers (name, contact, profile, created_by) VALUES (?, ?, ?, ?)",
        [name, contact, compressedImage, adminId],
        (err) => {
          if (err) return res.status(500).json(err);
          res.json({ success: true });
        }
      );

    } catch (err) {
      res.status(500).json(err);
    }
  });

  // GET items
  router.get("/items", requireAuth, (req, res) => {
    db.query(`
    SELECT items.*, 
           a.fullName AS created_by_name,
           item_price,
           (items.quantity - items.borrowed_count) AS available
    FROM items
    LEFT JOIN admins a ON items.created_by = a.id
    WHERE items.deleted_at IS NULL
  `, (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    });
  });

  // ADD item
  router.post("/items", requireAuth, (req, res) => {
    const { name, quantity, price } = req.body;
    const adminId = req.session.adminId;

    db.query(
      "INSERT INTO items (name, quantity, item_price, created_by) VALUES (?, ?, ?, ?)",
      [name, quantity || 1, price, adminId],
      (err) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true });
      }
    );
  });

  // DISPLAY item for modification
  router.get("/items/:id", requireAuth, (req, res) => {
    const { id } = req.params;

    db.query(
      `SELECT items.*, 
            a.fullName AS created_by_name,
            item_price,
            (items.quantity - items.borrowed_count) AS available
     FROM items
     LEFT JOIN admins a ON items.created_by = a.id
     WHERE items.id = ? AND items.deleted_at IS NULL`,
      [id],
      (err, result) => {
        if (err) return res.status(500).json(err);

        if (result.length === 0) {
          return res.status(404).json({ message: "Item not found" });
        }

        res.json(result[0]);
      }
    );
  });

  // MODIFY item
  router.put("/items/:id", requireAuth, (req, res) => {
    const { name, quantity, price } = req.body;
    const adminId = req.session.adminId;

    db.query(
      "UPDATE items SET name=?, quantity=?, item_price=?, updated_by=?, updated_at=NOW() WHERE id=?",
      [name, quantity, price || 0, adminId, req.params.id],
      (err) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true });
      }
    );
  });

  // BORROW item
  router.post("/borrow", requireAuth, (req, res) => {
    const { item_id, borrower, qty } = req.body;
    const adminId = req.session.adminId;

    const borrowQty = Number(qty || 1);

    db.query(
      "SELECT quantity, borrowed_count FROM items WHERE id=?",
      [item_id],
      (err, result) => {
        if (err) return res.status(500).json(err);

        const item = result[0];
        const available = item.quantity - item.borrowed_count;

        if (borrowQty > available) {
          return res.json({ success: false, message: "Not enough stock available" });
        }

        // update stock
        db.query(
          "UPDATE items SET borrowed_count = borrowed_count + ? WHERE id=?",
          [borrowQty, item_id]
        );

        // log
        db.query(
          `INSERT INTO borrow_logs (item_id, borrower, quantity, date_borrowed, created_by)
            VALUES (?, ?, ?, NOW(), ?)`,
          [item_id, borrower, borrowQty, adminId]
        );

        res.json({ success: true });
      }
    );
  });

  // FOR searching borrower
  router.get("/borrower-search", requireAuth, (req, res) => {
    let { page = 1, limit = 6, search = "" } = req.query;
    let offset = (page - 1) * limit;

    let sql = "SELECT * FROM borrowers WHERE name LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?";
    let values = [`%${search}%`, Number(limit), Number(offset)];

    db.query(sql, values, (err, result) => {
      if (err) return res.status(500).json(err);

      const formatted = result.map(r => {
        if (r.profile) {
          r.profile = `data:image/jpeg;base64,${r.profile.toString("base64")}`;
        }
        return r;
      });

      res.json(formatted);
    });
  });

  // DELETE item
  router.delete("/items/:id", requireAuth, (req, res) => {
    const adminId = req.session.adminId;

    db.query(
      "UPDATE items SET deleted_by=?, deleted_at=NOW() WHERE id=?",
      [adminId, req.params.id],
      (err) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true });
      }
    );
  });

  // RETURN item
  router.post("/return/:id", requireAuth, (req, res) => {
    const logId = req.params.id;
    const adminId = req.session.adminId;

    // 1. get log info
    db.query(
      "SELECT item_id, quantity FROM borrow_logs WHERE id=?",
      [logId],
      (err, result) => {
        if (err) return res.status(500).json(err);

        const { item_id, quantity } = result[0];

        // 2. mark as returned
        db.query(
          "UPDATE borrow_logs SET date_returned=NOW() WHERE id=?",
          [logId],
          (err2) => {
            if (err2) return res.status(500).json(err2);

            // 3. restore stock
            db.query(
              "UPDATE items SET borrowed_count = borrowed_count - ? WHERE id=?",
              [quantity, item_id],
              (err3) => {
                if (err3) return res.status(500).json(err3);

                res.json({ success: true });
              }
            );
          }
        );
      }
    );
  });

  // GET borrowed item id
  router.get("/borrowedItem/:id", requireAuth, (req, res) => {
    const { id } = req.params;

    db.query(
      "SELECT * FROM borrow_logs WHERE id=?",
      [id],
      (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length === 0) return res.status(404).json({ message: "Not found" });

        res.json(result[0]);
      }
    );
  });

  // PUT modified borrowed item
  router.put("/borrow_logs/:id", requireAuth, (req, res) => {

    const { borrower, item_id, quantity, date_borrowed } = req.body;
    const { id } = req.params;

    const newQty = Number(quantity);

    db.query(
      "SELECT item_id, quantity FROM borrow_logs WHERE id=?",
      [id],
      (err, result) => {

        if (err) return res.status(500).json(err);
        if (!result.length) return res.status(404).json({ message: "Not found" });

        const oldItemId = result[0].item_id;
        const oldQty = Number(result[0].quantity);

        // STEP 1: rollback old stock
        db.query(
          "UPDATE items SET borrowed_count = borrowed_count - ? WHERE id=?",
          [oldQty, oldItemId],
          (err1) => {
            if (err1) return res.status(500).json(err1);

            // STEP 2: check new item availability
            db.query(
              "SELECT quantity, borrowed_count FROM items WHERE id=?",
              [item_id],
              (err2, itemRes) => {

                if (err2) return res.status(500).json(err2);

                const item = itemRes[0];
                const available = item.quantity - item.borrowed_count;

                if (newQty > available) {

                  // rollback old stock if fail
                  return db.query(
                    "UPDATE items SET borrowed_count = borrowed_count + ? WHERE id=?",
                    [oldQty, oldItemId],
                    () => {
                      res.json({
                        success: false,
                        message: "Not enough stock available"
                      });
                    }
                  );
                }

                // STEP 3: apply new stock
                db.query(
                  "UPDATE items SET borrowed_count = borrowed_count + ? WHERE id=?",
                  [newQty, item_id],
                  (err3) => {

                    if (err3) return res.status(500).json(err3);

                    // STEP 4: update log
                    db.query(
                      `UPDATE borrow_logs
                     SET borrower=?, item_id=?, quantity=?, date_borrowed=?
                     WHERE id=?`,
                      [borrower, item_id, newQty, date_borrowed, id],
                      (err4) => {

                        if (err4) return res.status(500).json(err4);

                        res.json({ success: true });

                      }
                    );

                  }
                );

              }
            );

          }
        );

      }
    );
  });

  // GET logs
  router.get("/borrow_logs", requireAuth, (req, res) => {
    db.query(`
    SELECT borrow_logs.*, 
           items.name AS item_name,
           admins.fullName AS admin_name
    FROM borrow_logs
    JOIN items ON borrow_logs.item_id = items.id
    LEFT JOIN admins ON borrow_logs.created_by = admins.id
    WHERE borrow_logs.date_returned IS NULL
    ORDER BY borrow_logs.id DESC
  `, (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    });
  });

  // GET return logs
  router.get("/return_logs", requireAuth, (req, res) => {
    db.query(`
    SELECT borrow_logs.*, 
           items.name AS item_name,
           admins.fullName AS admin_name
    FROM borrow_logs
    JOIN items ON borrow_logs.item_id = items.id
    LEFT JOIN admins ON borrow_logs.created_by = admins.id
    WHERE borrow_logs.date_returned IS NOT NULL
    ORDER BY borrow_logs.id DESC
  `, (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    });
  });

  router.post("/void_return/:id", requireAuth, (req, res) => {
    const logId = req.params.id;

    // 1. get log info
    db.query(
      "SELECT item_id, quantity, date_returned FROM borrow_logs WHERE id=?",
      [logId],
      (err, result) => {
        if (err) return res.status(500).json(err);
        if (!result.length) return res.status(404).json({ message: "Not found" });

        const log = result[0];

        // if already not returned, prevent void
        if (!log.date_returned) {
          return res.json({
            success: false,
            message: "This item is not returned yet"
          });
        }

        // 2. remove return status
        db.query(
          "UPDATE borrow_logs SET date_returned=NULL WHERE id=?",
          [logId],
          (err2) => {
            if (err2) return res.status(500).json(err2);

            // 3. restore borrowed stock
            db.query(
              "UPDATE items SET borrowed_count = borrowed_count + ? WHERE id=?",
              [log.quantity, log.item_id],
              (err3) => {
                if (err3) return res.status(500).json(err3);

                res.json({ success: true });
              }
            );
          }
        );
      }
    );
  });


  // ADD REMINDER
  router.post("/reminders", requireAuth, (req, res) => {
    const {
      title,
      description,
      reminder_type,
      start_date,
      end_date,
      reminder_time,
      week_day,
      month_day
    } = req.body;

    const adminId = req.session.adminId;

    if (!title || !reminder_type) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    db.query(
      `
        INSERT INTO reminders (
          title,
          description,
          reminder_type,
          start_date,
          end_date,
          reminder_time,
          week_day,
          month_day,
          created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        description || null,
        reminder_type,
        start_date || null,
        end_date || null,
        reminder_time || null,
        week_day || null,
        month_day || null,
        adminId
      ],
      (err) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true });
      }
    );
  });


  // GET REMINDERS
  router.get("/reminders", requireAuth, (req, res) => {
    db.query(
      `
        SELECT r.*, a.fullName AS admin_name
        FROM reminders r
        LEFT JOIN admins a ON r.created_by = a.id
        WHERE r.is_active = 1
        ORDER BY r.id DESC
      `,
      (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
      }
    );
  });



  // DELETE (SOFT DELETE)
  router.delete("/reminders/:id", requireAuth, (req, res) => {
    db.query(
      "UPDATE reminders SET is_active = 0 WHERE id = ?",
      [req.params.id],
      (err) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true });
      }
    );
  });

  return router
};