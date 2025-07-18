const Company = require('../models/companyModel');
const User = require('../models/userModel');


const getCompanies = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('companies');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
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
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // User authentication is handled through JWT token, no browser identifier needed

    if (!req.body.name) {
      return res.status(400).json({
        success: false,
        message: 'Company name is required'
      });
    }

    // First, get all the user's companies to check for duplicates
    const userCompanyIds = user.companies.map(id => id.toString());
    const userCompanies = await Company.find({ _id: { $in: user.companies } });
    
    // Check if the user already has a company with the EXACT same name AND URL
    let existingSameNameAndUrl = null;
    if (req.body.url) {
      existingSameNameAndUrl = userCompanies.find(comp => 
        comp.name === req.body.name && comp.url === req.body.url);
    } else {
      // If URL is not provided, only match by name
      existingSameNameAndUrl = userCompanies.find(comp => comp.name === req.body.name);
    }
    
    // Check if the user has a company with the same name but different URL
    const existingSameNameDiffUrl = userCompanies.find(comp => 
      comp.name === req.body.name && 
      req.body.url && // Only if URL is provided
      comp.url !== req.body.url);
      
    let company;
    let statusCode = 201;
    
    if (existingSameNameAndUrl) {
      // If company with same name AND URL already exists for this user, update it
      console.log(`Updating existing company: ${req.body.name} with URL: ${req.body.url || 'none'}`);
      
      company = await Company.findByIdAndUpdate(
        existingSameNameAndUrl._id,
        { 
          ...req.body,
          applicationDate: existingSameNameAndUrl.applicationDate || req.body.applicationDate
        },
        { new: true, runValidators: true }
      );
      statusCode = 200; 
    } else if (existingSameNameDiffUrl) {
      // If company with same name but DIFFERENT URL exists, create a NEW company
      console.log(`Creating new company version: ${req.body.name} with different URL: ${req.body.url}`);
      
      company = await Company.create({
        ...req.body,
        user: req.user.id
      });
      
      user.companies.push(company._id);
      await user.save();
    } else {
      // No match found for this user, create brand new company
      console.log(`Creating new company: ${req.body.name} with URL: ${req.body.url || 'none'}`);
      
      company = await Company.create({
        ...req.body,
        user: req.user.id
      });
      
      user.companies.push(company._id);
      await user.save();
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
    
    const user = await User.findById(req.user.id);
    if (!user || !user.companies.includes(company._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this company'
      });
    }
    
    user.companies = user.companies.filter(
      companyId => companyId.toString() !== company._id.toString()
    );
    await user.save();

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
