var express = require('express');
var router = express.Router();
var storyHelpers = require('../helpers/story-helpers');
var adminHelpers = require('../helpers/admin-helpers');
var storyStatsHelpers = require('../helpers/story-stats-helpers');
const { route } = require('./users');
const multer = require('multer');
const fs = require('fs');
const path = require('path');


const upload = multer({ dest: 'uploads/' });

router.get('/dashboard', function(req, res) {
  if (req.session.admin){
    adminHelpers.getDashboardData().then((data) => {
      console.log(data);
      res.setHeader('Cache-Control', 'no-store');
      res.render('admin/dashboard', { admin: true, data, isLoggedIn: true });
    });
    }else{
      res.redirect('/admin/login');
    }
});
router.get('/account', function(req, res) {
  if (req.session.admin) {

    res.setHeader('Cache-Control', 'no-store');

    adminHelpers.getAdmin(req.session.admin._id).then((adminData) => {
      adminHelpers.getAllAdmins().then((admins) => {
        // Pass the flash messages to the template
        res.render('admin/account', {
          adminData,
          admin: true,
          isLoggedIn: true,
          admins,
          success_msg: req.flash('success_msg'),
          error_msg: req.flash('error_msg'),
        });
      });
    });
  } else {
    res.redirect('/admin/login');
  }
});


/* GET users listing. */
router.get('/', function(req, res, next) {
  storyHelpers.getAllStories().then((stories) => {
    if (req.session.admin){
      res.setHeader('Cache-Control', 'no-store');
      
    res.render('admin/view-stories', { stories, admin: true, isLoggedIn: true });
    }else{
      res.redirect('/admin/login');
    }
  }
  );
});

router.get('/login', function(req, res) {
  res.render('admin/login', { admin: true });
}
);
router.post('/login', function(req, res) {
  adminHelpers.verifyAdmin(req.body.email, req.body.password).then((admin) => {
    if (admin) {
      req.session.admin = admin;
      req.session.save(() => {
        res.redirect('/admin'); // Go to home after login
      });  
    } else {
      res.redirect('/admin/login');
    }
  });
});
router.get('/logout', function(req, res) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Failed to destroy session.");
    }
    res.redirect('/admin/login'); // Redirect to login after destroying the session
  });
});


router.get('/change-password', function(req, res) {
  res.render('admin/change-password.hbs', { admin: true ,isLoggedIn: true});
});


router.post('/', function(req, res, next) {
  // Add story to the database
  storyHelpers.addStory(req.body, (result) => {
    if (!result) {
      return res.status(500).send("Failed to add story to the database.");
    }

    // Move the image file
    let image = req.files.image;
    let imagePath = `./public/images/story-images/${result}.jpg`; // Use the database ID as the filename
    image.mv(imagePath, (err) => {
      if (err) {
        console.error("Error moving image file:", err);
        return res.status(500).send("Failed to save image.");
      }
      let storyStats = {
        storyId: result,
        listenCount: 0,
        listenTime: 0,
        likes: 0
      }
      storyStatsHelpers.addStoryStats(storyStats, (statsResult) => {
        if (!statsResult) {
          return res.status(500).send("Failed to add story stats to the database.");
        }
      }
      );

      // Move the text file (assuming req.files.storyFile contains the text file)
      let storyFile = req.files.storyFile;
      let storyFilePath = `./public/texts/story-texts/${result}.txt`; // Use the database ID as the filename
      storyFile.mv(storyFilePath, (err) => {
        if (err) {
          console.error("Error moving text file:", err);
          return res.status(500).send("Failed to save text file.");
        }
        // If both files are moved successfully, render the view
        // res.render('admin/view-stories', { admin: true });
        res.redirect('/admin');
      });
    });
  });
});



// Route to delete a story by its ID
router.get('/deletestory/:id', function(req, res, next) {
  const storyId = req.params.id; // Get the story ID from the URL
  storyHelpers.deleteStory(storyId).then((result) => {
      if (result) {
          res.json({ message: 'Story deleted successfully' }); // Respond with success
      } else {
          res.json({ message: 'Failed to delete the story' }); // Respond with failure
      }
  }).catch((err) => {
      console.error(err);
      res.json({ message: 'Error deleting the story' });
  });
});


router.post('/updatestory', async (req, res) => {
  // Log the incoming request body and files
  console.log('Request Body:', req.body);
 // console.log('Request Files:', req.files.changedImage);

  // Ensure req.body contains the expected fields, especially _id
  if (!req.body._id) {
      console.error('Missing _id in the request body');
      return res.status(400).send('Missing _id in the request body');
  }
  var imageName= req.body._id;
  // Update the story in the database
  storyHelpers.updateStory(req.body._id, req.body, async (result, err) => {
      if (!result) {
          console.error('Failed to update story:', err);
          return res.status(500).send("Failed to update story in the database.");
      }

      // Check if a new image has been uploaded
      if (req.files && req.files.changedImage) {
          const image = req.files.changedImage;
          // Ensure the directory exists
          const imageDir = path.join(__dirname, '../public/images/story-images');
          if (!fs.existsSync(imageDir)) {
              fs.mkdirSync(imageDir, { recursive: true }); // Create the directory if it doesn't exist
          }
          
         
          console.log(imageName);

          let imagePath = `./public/images/story-images/${imageName}.jpg`;

          try {
              await image.mv(imagePath);
              console.log('Image uploaded and moved successfully to:', imagePath);
              return res.redirect('/admin');
          } catch (err) {
              console.error('Error moving image file:', err);
              return res.status(500).send('Failed to save image.');
          }
      } else {
          // No new image uploaded
          console.log('No new image uploaded.');
          return res.redirect('/admin');
      }
  });
});


router.post('/update-profile', async (req, res) => {
  try {
    // 1. Correct session access (use req.session consistently)
    if (!req.session || !req.session.admin || !req.session.admin._id) {
      req.flash('error', 'Session expired or invalid. Please login again.');
      return res.redirect('/admin/login');
    }

    const adminId = req.session.admin._id;

    // 2. Validate request body
    if (!req.body || Object.keys(req.body).length === 0) {
      req.flash('error', 'No data provided for update');
      return res.redirect('/admin/account');
    }

    // 3. Use async/await for better error handling
    const result = await adminHelpers.updateAdmin(adminId, req.body);

    if (result) {
      req.flash('success', 'Profile updated successfully');
      // Update session data if needed
      if (req.body.email) req.session.admin.email = req.body.email;
      if (req.body.name) req.session.admin.name = req.body.name;
    } else {
      req.flash('error', 'Failed to update profile');
    }
    
    return res.redirect('/admin/account');
  } catch (error) {
    console.error('Update profile error:', error);
    req.flash('error', 'An error occurred while updating your profile');
    return res.redirect('/admin/account');
  }
});





router.delete('/delete-admin/:id', async (req, res) => {
  try {
    const adminId = req.params.id;
    if (!adminId) {
      return res.json({ success: false, message: 'Admin ID required' });
    }

    req.session.admin=req.session.admin || {}
    if(req.session.admin._id == adminId){
    req.session.destroy(async (err) => {
      if (err) {
        return res.status(500).send("Failed to destroy session");
      }
      // Now proceed to delete the admin after session is destroyed
      const deleted = await adminHelpers.deleteAdmin(adminId);
      if (deleted) {
        // After deleting the admin, send the success response or redirect
        return res.json({ success: true });
      } else {
        return res.json({ success: false, message: 'Admin not found' });
      }
    });
  }else{
    const deleted = await adminHelpers.deleteAdmin(adminId);
    if (deleted) {
      // After deleting the admin, send the success response or redirect
      return res.json({ success: true });
    } else {
      return res.json({ success: false, message: 'Admin not found' });
    }
  }

  } catch (error) {
    console.error('Delete error:', error);
    res.json({ success: false, message: 'Server error' });
  }

});
router.post('/create-admin', async (req, res) => {
  console.log(req.body);
  let adminData = {};
  adminData.username = req.body.username;
  adminData.email = req.body.email;
  adminData.password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  adminData.role = 'admin';
  adminData.createdAt = new Date();
  adminData.updatedAt = new Date();

  console.log("ADMIN DATA VAR AT ROUTE IS: ", adminData);

  if (adminData.password === confirmPassword) {
    try {
      const adminExists = await adminHelpers.getAdminByEmail(adminData.email);
      if (adminExists) {
        req.flash('error_msg', 'Admin account already exists.');
        return res.redirect('/admin/account');
      }
      await adminHelpers.addAdmin(adminData);
      req.flash('success_msg', 'Admin created successfully!');
      res.redirect('/admin/account');
    } catch (error) {
      console.error('Error during admin creation:', error);
      req.flash('error_msg', 'Something went wrong while creating the admin.');
      res.redirect('/admin/account');
    }
  } else {
    req.flash('error_msg', 'Error adding admin: password mismatch.');
    res.redirect('/admin/account');
    console.log('PASSWORD MISMATCH');
  }
});

router.post('/change-password', async (req, res) => {
  const adminId = req.session.admin._id;
  const { currentPassword, newPassword, confirmPassword } = req.body;

  try {
    // Client-side validation checks first
    if (newPassword !== confirmPassword) {
      return res.render('admin/change-password', { 
        error: 'New password and confirmation do not match',
        formData: req.body // Preserve form data
      });
    }

    if (newPassword.length < 8) {
      return res.render('admin/change-password', { 
        error: 'Password must be at least 8 characters',
        formData: req.body
      });
    }

    const result = await adminHelpers.changePassword(adminId, currentPassword, newPassword);

    if (result.success) {
      req.flash('success', 'Password updated successfully');
      return res.redirect('/admin/account');
    } else {
      return res.render('admin/change-password', { 
        error: result.message,
        formData: req.body
      });
    }
  } catch (error) {
    console.error('Error changing password:', error);
    req.flash('error', 'An error occurred while changing your password');
    res.redirect('/admin/account');
  }
});

module.exports = router;