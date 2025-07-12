const Company = require('../models/companyModel');
const User = require('../models/userModel');


const getCompanies = async (req, res, next) => {
  try {
    // Get companies for the authenticated user
    const user = await User.findById(req.user.id).populate('companies');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // If companies are populated, we can return them directly
    // Otherwise, find companies by ID from the user's companies array
    let companies;
    if (user.companies[0] && typeof user.companies[0] !== 'string') {
      companies = user.companies;
    } else {
      companies = await Company.find({ _id: { $in: user.companies } })
        .sort({ applicationDate: -1 });
    }
    
    res.status(200).json({
      success: true,
      count: companies.length,
      data: companies
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving companies'
    });
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
    
    // Check if the company belongs to the authenticated user
    const user = await User.findById(req.user.id);
    if (!user || !user.companies.includes(company._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this company'
      });
    }

    res.status(200).json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error('Error retrieving company:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving company details'
    });
  }
};

const createCompany = async (req, res, next) => {
  try {
    // Find the user by ID
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Set browserIdentifier from user if available
    if (user.browserIdentifier && !req.body.browserIdentifier) {
      req.body.browserIdentifier = user.browserIdentifier;
    }
    
    // Ensure we have a company name
    if (!req.body.name) {
      return res.status(400).json({
        success: false,
        message: 'Company name is required'
      });
    }

    // Set up filter to check for existing companies
    const filter = { name: req.body.name };
    if (req.body.browserIdentifier) {
      filter.browserIdentifier = req.body.browserIdentifier;
    }
    
    // Check if company already exists for this user
    const userCompanyIds = user.companies.map(id => id.toString());
    const existingCompanies = await Company.find(filter);
    const existingCompany = existingCompanies.find(company => 
      userCompanyIds.includes(company._id.toString())
    );
    
    let company;
    let statusCode = 201; 
    
    if (existingCompany) {
      // Update existing company
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
      // Create new company with user ID
      company = await Company.create({
        ...req.body,
        user: req.user.id // Associate company with user
      });
      
      // Add company ID to user's companies array
      user.companies.push(company._id);
      await user.save();
      
      console.log(`Created new company: ${req.body.name}`);
    }
    
    res.status(statusCode).json({
      success: true,
      data: company,
      isNew: statusCode === 201
    });
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating company record'
    });
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

    // Check if the company belongs to the authenticated user
    const user = await User.findById(req.user.id);
    if (!user || !user.companies.includes(company._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this company'
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
    console.error('Error updating company:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating company record'
    });
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
    
    // Check if the company belongs to the authenticated user
    const user = await User.findById(req.user.id);
    if (!user || !user.companies.includes(company._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this company'
      });
    }
    
    // Remove company ID from user's companies array
    user.companies = user.companies.filter(
      companyId => companyId.toString() !== company._id.toString()
    );
    await user.save();

    // Delete the company
    await company.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Company successfully deleted'
    });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting company record'
    });
  }
};

module.exports = {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany
};
