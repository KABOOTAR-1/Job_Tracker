const express = require('express');
const router = express.Router();
const { 
  getCompanies, 
  getCompany, 
  createCompany, 
  updateCompany, 
  deleteCompany 
} = require('../controllers/companyController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getCompanies)
  .post(createCompany);

router.route('/:id')
  .get(getCompany)
  .put(updateCompany)
  .delete(deleteCompany);

module.exports = router;
