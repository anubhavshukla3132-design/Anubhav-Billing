const Bill = require("../models/Bill");

// Get all bills with search and pagination
exports.getBills = async (req, res) => {
  try {
    const { search = "" } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    // Build query
    let query = {};
    if (search) {
      query = {
        $or: [
          { invoiceNumber: { $regex: search, $options: "i" } }
        ]
      };
    }

    // Fetch bills (populate patient)
    let bills = await Bill.find(query)
      .populate({
        path: "patient",
        match: search ? { name: { $regex: search, $options: "i" } } : {},
      })
      .sort({ createdAt: -1 })
      .lean();

    // Filter out bills where patient was filtered out by populate match
    const filteredBills = bills.filter(bill => {
      if (!search) return true;
      if (bill.invoiceNumber.toLowerCase().includes(search.toLowerCase())) return true;
      return bill.patient !== null;
    });

    // In-memory pagination (required due to cross-collection text searching without complex aggregate)
    const total = filteredBills.length;
    const paginatedBills = filteredBills.slice((page - 1) * limit, page * limit);

    res.json({
      data: paginatedBills,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Error fetching bills:", error);
    res.status(500).json({ error: "Failed to fetch bills" });
  }
};

// Get single bill details
exports.getBillById = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate("patient");
    if (!bill) {
      return res.status(404).json({ error: "Bill not found" });
    }
    res.json(bill);
  } catch (error) {
    console.error("Error fetching bill:", error);
    res.status(500).json({ error: "Failed to fetch bill" });
  }
};

// Delete a bill
exports.deleteBill = async (req, res) => {
  try {
    const bill = await Bill.findByIdAndDelete(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: "Bill not found" });
    }
    res.json({ message: "Bill deleted successfully" });
  } catch (error) {
    console.error("Error deleting bill:", error);
    res.status(500).json({ error: "Failed to delete bill" });
  }
};
