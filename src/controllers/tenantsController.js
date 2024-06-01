const pool = require("../database/db.js");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");

const createTenant = catchAsyncErrors(async (req, res, next) => {
  const { tenant_name, membership, status } = req.body;
  const query = `
  INSERT INTO tenants 
  (tenant_name, membership, status) 
  VALUES($1, $2, $3) 
  RETURNING *`;

  try {
    const newTenant = await pool.query(query, [tenant_name, membership, status]);

    res.status(201).json({
      success: true,
      message: `New Tenant: ${newTenant.rows[0].tenant_id} successfully created`,
      data: newTenant.rows,
    });
  } catch (err) {
    return next(new ErrorHandler(`Error: Unable to create Tenant. Message: ${err.message}`, 500));
  }
});

const getTenants = catchAsyncErrors(async (req, res, next) => {
  const query = "SELECT * FROM tenants";

  try {
    const tenants = await pool.query(query);

    res.status(200).json({
      success: true,
      total: tenants.rows.length,
      data: tenants.rows,
    });
  } catch (err) {
    return next(new ErrorHandler(`Error: Unable to retrieve Tenants. Message: ${err.message}`, 500));
  }
});

const getTenantById = catchAsyncErrors(async (req, res, next) => {
  const tenantId = req.params.id;
  const query = `
  SELECT * FROM tenants 
  WHERE tenant_id = $1`;

  try {
    const tenant = await pool.query(query, [tenantId]);

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: `Tenant: ${tenantId} not found`,
      });
    }

    res.status(200).json({
      success: true,
      total: tenant.rows.length,
      data: tenant.rows,
    });
  } catch (err) {
    return next(new ErrorHandler(`Error: Unable to retrieve Tenant: ${tenantId}. Message: ${err.message}`, 500));
  }
});

const updateTenant = catchAsyncErrors(async (req, res, next) => {
  const tenantId = req.params.id;
  const { tenant_name, membership, status } = req.body;
  const query = `
      UPDATE tenants 
      SET tenant_name = $1, membership = $2, status = $3 
      WHERE tenant_id = $4
      RETURNING *
    `;

  const values = [tenant_name, membership, status, tenantId];

  try {
    const updatedTenant = await pool.query(query, values);
    if (updatedTenant.rowCount === 0) {
      return next(new ErrorHandler(`Tenant: ${tenantId}, not found`, 404));
    }

    res.status(200).json({
      success: true,
      message: `Tenant: ${tenantId} successfully updated`,
      data: updatedTenant.rows[0],
    });
  } catch (err) {
    return next(new ErrorHandler(`Unable to update Tenant: ${tenantId}. Message: ${err.message}`, 500));
  }
});

const deleteTenant = catchAsyncErrors(async (req, res, next) => {
  const tenantId = req.params.id;
  try {
    const query = `
    DELETE FROM tenants
    WHERE tenant_id = $1
    `;

    await pool.query(query, [tenantId]);

    res.status(200).json({
      success: true,
      message: `Tenant: ${tenantId} successfully deleted`,
    });
  } catch (err) {
    return next(new ErrorHandler(`Error: Unable to delete Tenant: ${tenantId}. Message: ${err.message}`, 500));
  }
});

module.exports = { createTenant, getTenants, getTenantById, updateTenant, deleteTenant };
