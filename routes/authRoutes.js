const express = require("express");
const router = express.Router();
const db = require("../config/db.config");

function handleAuth(req, res) {
    if (req.session?.admin) {
        return res.redirect(`/${req.session.admin}/page/dashboard`);
    }

    return res.sendFile(process.cwd() + "/public/auth.html");
}

// BOTH routes use same function
router.get(["/", "/auth"], handleAuth);

router.get("/auth/check", (req, res) => {
    if (req.session.admin) {
        res.json({ authenticated: true });
    } else {
        res.status(401).json({ authenticated: false });
    }
});

router.post("/login", (req, res) => {

    const { username, password } = req.body;

    const sql = "SELECT * FROM admins WHERE username=? LIMIT 1";

    db.query(sql, [username], (err, rows) => {

        if (err || rows.length === 0) {
            return res.json({ success: false });
        }

        const admin = rows[0];

        console.log(admin)

        if (password === admin.password) {
            req.session.adminId = admin.id;
            req.session.admin = admin.username;
            console.log("Logged in admin:", req.session.admin);

            return res.json({
                success: true,
                id: admin.id,
                username: admin.username,
                session: req.session,
                fullName: admin.fullName,
                accountType: admin.account_type
            });
        }

        res.json({ success: false });

    });

});


router.get("/logout", (req, res) => {

    req.session.destroy(() => {
        res.redirect("/auth");
    });

});


module.exports = router;