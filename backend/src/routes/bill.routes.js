const express = require("express");
const router = express.Router();
const billController = require("../controllers/bill.controller");

router.get("/", billController.getBills);
router.get("/:id", billController.getBillById);
router.delete("/:id", billController.deleteBill);

module.exports = router;
