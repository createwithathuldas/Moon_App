var express = require('express');
var router = express.Router();
var storyHelpers = require('../helpers/story-helpers');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const userHelper = require('../helpers/user-helper');
var  storyStatsHelpers = require('../helpers/story-stats-helpers');

/* GET home page. */
router.get('/', function(req, res, next) {
  storyHelpers.getAllStories().then((stories) => {
    if (req.session.user && req.session.user.isLoggedIn) {

      res.setHeader('Cache-Control', 'no-store');

    res.render('index', { stories, admin: false,isLoggedIn: true });
    } else {
      res.render('index', { stories, admin: false , isLoggedIn: false});
    }
  }
  );
});
router.get('/useraccount', (req,res)=>{
  res.setHeader('Cache-Control', 'no-store');
  req.session.user=req.session.user || {};
  req.session.user._id=req.session.user._id || null;
  userHelper.getUser(req.session.user._id).then((user)=>{
    res.render('users/useraccount',{user,admin:false,isLoggedIn:true});
  });
});
router.get('/useraccount/edit', (req,res)=>{
  req.session.user=req.session.user || {};
  req.session.user._id=req.session.user._id || null;
  userHelper.getUser(req.session.user._id).then((user)=>{
    res.render('users/edit-user-account',{user,admin:false,isLoggedIn:true});
  });
});

router.get('/login',function(req,res){
  res.render('login.hbs',{admin:false})
})

router.get('/register',function(req,res){
  res.render('register.hbs',{admin:false})
})
router.get('/register/age',function(req,res){
  res.render('get-user-age.hbs',{admin:false})
})
router.get('/register/voice',function(req,res){
  res.render('get-user-voice.hbs',{admin:false})
})
// router.post('/play',async (req,res)=>{
//   if (req.session.user && req.session.user.isLoggedIn) {
//       let currentStoryId = req.body.currentStoryId;
//       console.log('Received storyId:', currentStoryId);
//       req.session.user = req.session.user || {}; 
//       let currentUserId = req.session.user._id || null;
//       console.log('Current User ID:', currentUserId);
//       const story = await storyHelpers.getOneStory(currentStoryId);
//       const user = await userHelper.getUser(currentUserId);
//       const comments = await storyStatsHelpers.getComments(currentStoryId);
//       const storystats = await storyStatsHelpers.getStoryStats(currentStoryId);
//       const initializeComments = await storyStatsHelpers.getStoryStats(currentStoryId,currentUserId);
//       console.log("INITIALIZED THE COMMENTS WITHIN ID : "+initializeComments);
//       const combinedData = { story, user ,comments, storystats};
//     console.log(combinedData);
//       res.render('users/play-stories',{combinedData,admin: false,isLoggedIn: true});
//   }else{
//     res.redirect('/login');
//   }
// })
// GET method for '/play' to render the play story page
router.get('/play', async (req, res) => {
  if (req.session.user && req.session.user.isLoggedIn) {
    let currentStoryId = req.query.storyId || null;
    console.log('Received storyId:', currentStoryId);
    req.session.user = req.session.user || {}; 
    let currentUserId = req.session.user._id || null;
    console.log('Current User ID:', currentUserId);
    
    // Fetch story, user, and comments data
    const story = await storyHelpers.getOneStory(currentStoryId);
    const user = await userHelper.getUser(currentUserId);
    const comments = await storyStatsHelpers.getComments(currentStoryId);
    const storystats = await storyStatsHelpers.getStoryStats(currentStoryId);
    
    // Initialize comments for this user/story
    const commentId = await storyStatsHelpers.initializeComments(currentStoryId, currentUserId);
    console.log("INITIALIZED THE COMMENTS WITHIN ID:", commentId);
    
    if (!story) {
      return res.status(404).send('Story not found');
    }
    let isLiked;
    for (const comment of comments) {
      // Compare string representations of ObjectIds
      if (comment.userId.toString() === currentUserId.toString()) {
        isLiked = comment.like;
        console.log(`Is liked: ${isLiked}`);
        break; // Remove if you want to check all comments
      }
    }
    // Combine all the data to send to the view
    const combinedData = { story, user, comments, storystats, commentId , isLiked};
    console.log(combinedData);

    res.render('users/play-stories', { combinedData, admin: false, isLoggedIn: true });
  } else {
    res.redirect('/login');
  }
});


router.post('/register',async function(req,res){
  const { name, email, password } = req.body;
  const userExists = await userHelper.checkUserExists(email);
  if (userExists) {
    req.flash('error', 'Email already registered. Please log in.');
      return res.redirect('/login');
  }
    req.session.registrationData = { name, email, password };
    console.log('Step 1 Data:', req.session.registrationData);
    res.redirect('/register/age'); // Redirect to the next step
});
router.post('/register/age', (req, res) => {
  const { age, gender } = req.body;
  
  req.session.registrationData = req.session.registrationData || {};
  req.session.registrationData.age = age;
  req.session.registrationData.gender = gender;

  console.log('Step 2 Data:', req.session.registrationData);

  res.redirect('/register/voice');
});
router.post('/register/voice',function(req,res){
  req.session.registrationData = req.session.registrationData || {};
  const registeruserdata = req.session.registrationData;
  registeruserdata.createdAt = new Date();
  console.log('Step 3 Data:', registeruserdata);
  userHelper.registerUser(registeruserdata, (result) => {
    if (!result) {
      return res.status(500).send("Failed to add user to the database.");
    }

    let voice=req.files.voiceFile;
    let voicePath=`./public/voices/user-voices/${result}.wav`;
    voice.mv(voicePath,(err)=>{
      if(err){
        console.error("Error moving voice file:", err);
        return res.status(500).send("Failed to save voice file.");
      }

      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).send("Session setup failed");
        }
        // Set up user data in the session
        req.session.user = {
          _id: result,
          email: registeruserdata.email,
          isLoggedIn: true
        };
        // Make the session cookie persistent for 7 days
        req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days expiration
      
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.status(500).send("Session save failed");
          }
          console.log("New session:", req.session.user); // Debug log
          res.redirect('/');
        });
      });  

    });

  });
 });


 router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // 1. First check if user exists at all
    const userExists = await userHelper.checkUserExists(email);
    if (!userExists) {
      req.flash('error', 'Account not found. Please register.');
      return res.redirect('/register'); // Redirect to register if no account
    }

    // 2. Verify password for existing user
    const user = await userHelper.verifyUser(email, password);
    if (!user) {
      req.flash('error', 'Wrong password. Try again.'); // Show error but stay on login
      return res.redirect('/login');
    }

    // 3. Successful login
    req.session.user = { 
      _id: user._id, 
      email: user.email, 
      isLoggedIn: true 
    };

    // Configure session cookie to last for 7 days
    req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // Set cookie expiration time to 7 days

    req.session.save(() => {
      res.redirect('/'); // Go to home after login
    });

  } catch (err) {
    console.error("Login error:", err);
    req.flash('error', 'Login failed. Try again later.');
    res.redirect('/login');
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Failed to log out');
    }

    // Clear the session cookie (make sure the cookie name matches)
    res.clearCookie('connect.sid'); // 'connect.sid' is the default session cookie name
    res.redirect('/login'); // Redirect to login page after logout
  });
});
router.post('/useraccount/edit', async (req, res) => {
  const userId = req.session.user._id;
  const userData = req.body;

  try {
    // Optionally log userId to check if it's valid
    console.log('User ID:', userId);

    const result = await userHelper.updateUser(userId, userData);
    if (result) {
      res.redirect('/useraccount');
    } else {
      res.redirect('/useraccount/edit');
    }
  } catch (err) {
    console.error('Error in updating user:', err);
    res.redirect('/useraccount/edit');
  }
});
  router.get('/useraccount/delete',async (req,res)=>{
  const userId = req.session.user._id;
  try {
    const result = await userHelper.deleteUser(userId);
    if (result) {
      res.redirect('/login');
    } else {
      res.redirect('/useraccount');
    }
  } catch (err) {
    console.error('Error in deleting user:', err);
    res.redirect('/useraccount');
  }
});

router.get('/useraccount/change-password', (req, res) => {
  res.render('users/change-password', { admin: false, isLoggedIn: true,success: req.flash('success'), error: req.flash('error') });
});
router.post('/useraccount/change-password', async (req, res) => {
  const userId = req.session.user._id;
  const { currentPassword, newPassword, confirmPassword } = req.body;

  try {
    // Client-side validation checks first
    if (newPassword !== confirmPassword) {
      return res.render('useraccount/change-password', { 
        error: 'New password and confirmation do not match',
        formData: req.body // Preserve form data
      });
    }

    if (newPassword.length < 8) {
      return res.render('useraccount/change-password', { 
        error: 'Password must be at least 8 characters',
        formData: req.body
      });
    }

    const result = await userHelper.changePassword(userId, currentPassword, newPassword);

    if (result.success) {
      req.flash('success', 'Password updated successfully');
      return res.redirect('/useraccount');
    } else {
      return res.render('useraccount/change-password', { 
        error: result.message,
        formData: req.body
      });
    }
  } catch (err) {
    console.error('Error in changing password:', err);
    return res.render('useraccount/change-password', { 
      error: 'An unexpected error occurred. Please try again later.',
      formData: req.body
    });
  }
});

router.get('/update-voice',function(req,res){
  res.render('get-user-voice.hbs',{admin:false,isLoggedIn:true})
})
router.post('/update-voice',function(req,res){
  let voice=req.files.voiceFile;
  let voicePath=`./public/voices/user-voices/${req.session.user._id}.wav`;
  voice.mv(voicePath,(err)=>{
    if(err){
      console.error("Error moving voice file:", err);
      return res.status(500).send("Failed to save voice file.");
    }
    res.redirect('/useraccount');
  });
});


//add remove story like
router.post('/play/like',function (req,res){
  let storyId = req.body.storyId;
  let userId = req.session.user._id;
  let likeState = req.body.like;
  console.log("Like state: " + likeState);  // Concatenate string and variable
  console.log("Story id: " + storyId);
  console.log("userid "+userId);
  storyStatsHelpers.addRemoveLike(storyId,userId,likeState).then((result)=>{
    res.redirect(`/play?storyId=${storyId}`);
  }).catch((err)=>{
    console.error('Error in adding/removing like:', err);
    res.status(500).json({status:false});
  });
});


router.post('/comments',(req,res)=>{
  console.log("Adding comment for story ID:", req.body.storyId);
  console.log("Comment text:", req.body.comment);
  console.log("User ID:", req.session.user._id);

  if (!req.body.storyId || !req.body.comment) {
    req.flash('error', 'Story ID or comment text is missing');
    return res.redirect('back');
  }

  const { storyId, comment } = req.body;
  const userId = req.session.user._id;

  storyStatsHelpers.addComment(storyId, userId, comment).then((result) => {
    if (result) {
      req.flash('success', 'Comment added successfully');
      console.log('Comment added successfully');
    } else {
      req.flash('error', 'Failed to add comment');
      console.log('Failed to add comment');
    }
    res.redirect(`/play?storyId=${storyId}`);
  }).catch((err) => {
    console.error('Error in adding comment:', err);
    req.flash('error', 'Failed to add comment');
    res.redirect('back');
  });
}
);

router.post('/comments/delete', async (req, res) => {
  try {
    console.log("Deleting comment for comment ID:", req.body.commentId);
    
    if (!req.body.commentId) {
      req.flash('error', 'No comment ID provided');
      return res.redirect('back');
    }


      const { commentId } = req.body; // Assuming storyId is passed in the request body
      // Call the deleteComment method
      console.log("Got the id in backend : ", commentId);
      const result = await storyStatsHelpers.deleteComment(commentId);
      if (result.deletedCount === 1) {
          req.flash('success', 'Comment has been deleted');
          console.log('Comment deleted');
      } else {
          req.flash('error', 'Failed to delete comment');
          console.log('Failed to delete comment');
      }

      // Redirect back to the story page with storyId
      res.redirect(`/play?storyId=${storyId}`);
  } catch (error) {
      console.error(error);
      req.flash('error', 'Failed to delete comment');
      res.redirect('back');
  }
});






module.exports = router;
