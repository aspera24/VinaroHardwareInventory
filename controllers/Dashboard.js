const db = require("../models");
const dashboardObj = db.dashboard;

exports.getAllData = async (req, res) => {
    try {
        const data = await categoriesObj.findAll({
            order: [["type_id", "ASC"]]
        });

        return res.status(200).send({
            data,
            isError: false,
            message: "Success fetching categories"
        });
    } catch (error) {
        return res.status(500).send({
            message: error.message || "Error retrieving categories",
            isError: true
        });
    }
}