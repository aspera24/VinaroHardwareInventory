module.exports = (io) => {
  const express = require("express");
  const router = express.Router();
  const db = require("../config/db.config");
  const requireAuth = require("../middleware/authMiddleware");

  // GET borrowers
  router.get("/borrower", requireAuth, (req, res) => {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 6;

    let offset = (page - 1) * limit;

    db.query(
      "SELECT * FROM borrowers ORDER BY id DESC LIMIT ? OFFSET ?",
      [limit, offset],
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


  // ADD BORROWER
  const multer = require("multer");
  const sharp = require("sharp");

  const upload = multer({ storage: multer.memoryStorage() });

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