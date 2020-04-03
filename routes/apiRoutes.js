module.exports = (io) => {
  const express = require("express");
  const router = express.Router();
  const db = require("../config/db.config");
  const requireAuth = require("../middleware/authMiddleware");

  // GET items
  router.get("/items", requireAuth, (req, res) => {
    db.query(`
    SELECT items.*, a.fullName AS created_by_name
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
    const { name } = req.body;
    const adminId = req.session.adminId;

    db.query(
      "INSERT INTO items (name, created_by) VALUES (?, ?)",
      [name, adminId],
      (err) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true });
      }
    );
  });

  // BORROW item
  router.post("/borrow", requireAuth, (req, res) => {
    const { item_id, borrower } = req.body;
    const adminId = req.session.adminId;

    db.query(
      "UPDATE items SET status='borrowed' WHERE id=? AND status='available'",
      [item_id],
      (err, result) => {
        if (result.affectedRows === 0) {
          return res.json({ success: false, message: "Already borrowed" });
        }

        db.query(
          `INSERT INTO logs (item_id, borrower, date_borrowed, created_by)
         VALUES (?, ?, NOW(), ?)`,
          [item_id, borrower, adminId]
        );

        res.json({ success: true });
      }
    );
  });


  router.put("/items/:id", requireAuth, (req, res) => {
    const { name } = req.body;
    const adminId = req.session.adminId;

    db.query(
      "UPDATE items SET name=?, updated_by=?, updated_at=NOW() WHERE id=?",
      [name, adminId, req.params.id],
      (err) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true });
      }
    );
  });


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

    // 1. update log
    db.query(
      "UPDATE logs SET date_returned=NOW() WHERE id=?",
      [logId],
      (err) => {
        if (err) return res.status(500).json(err);

        // 2. update item back to available
        db.query(
          `UPDATE items 
         SET status='available', updated_by=?, updated_at=NOW()
         WHERE id=(SELECT item_id FROM logs WHERE id=?)`,
          [adminId, logId],
          (err2) => {
            if (err2) return res.status(500).json(err2);

            res.json({ success: true });
          }
        );
      }
    );
  });

  // GET logs
  router.get("/logs", requireAuth, (req, res) => {
    db.query(`
    SELECT logs.*, 
           items.name AS item_name,
           admins.fullName AS admin_name
    FROM logs
    JOIN items ON logs.item_id = items.id
    LEFT JOIN admins ON logs.created_by = admins.id
    ORDER BY logs.id DESC
  `, (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    });
  });

  return router
};