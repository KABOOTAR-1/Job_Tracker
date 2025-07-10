const Company = require('../models/companyModel');


const getCompanies = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.browserIdentifier) {
      filter.browserIdentifier = req.query.browserIdentifier;
    }
    
    const companies = await Company.find(filter)
      .sort({ applicationDate: -1 });
    
    res.status(200).json({
      success: true,
      count: companies.length,
      data: companies
    });
  } catch (error) {
    next(error);
  }
};


const getCompany = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.status(200).json({
      success: true,
      data: company
    });
  } catch (error) {
    next(error);
  }
};

const createCompany = async (req, res, next) => {
  try {
    const filter = { name: req.body.name };
    
    if (req.body.browserIdentifier) {
      filter.browserIdentifier = req.body.browserIdentifier;
    }
    
    const existingCompany = await Company.findOne(filter);
    
    let company;
    let statusCode = 201; 
    
    if (existingCompany) {
      company = await Company.findByIdAndUpdate(
        existingCompany._id,
        { 
          ...req.body,
          applicationDate: existingCompany.applicationDate || req.body.applicationDate
        },
        { new: true, runValidators: true }
      );
      statusCode = 200; 
      console.log(`Updated existing company: ${req.body.name}`);
    } else {
      company = await Company.create(req.body);
      console.log(`Created new company: ${req.body.name}`);
    }
    
    res.status(statusCode).json({
      success: true,
      data: company,
      isNew: statusCode === 201
    });
  } catch (error) {
    next(error);
  }
};

const updateCompany = async (req, res, next) => {
  try {
    let company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    company = await Company.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: company
    });
  } catch (error) {
    next(error);
  }
};

const deleteCompany = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    await company.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany
};
