const express = require("express");
const router = express.Router();

const {
  createTenant,
  getTenants,
  getTenantById,
  updateTenant,
  deleteTenant,
} = require("../controllers/tenantsController");
// const { isAuthenticatedUser } = require("../middleware/auth");

router.route("/tenants").post(createTenant);
router.route("/tenants").get(getTenants);
router.route("/tenants/:id").get(getTenantById).put(updateTenant).delete(deleteTenant);

module.exports = router;
