const multer = require('multer');

const profileUploads = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'public');
        },
        filename: (req, file, cb) => {
            cb(null, Date.now() + '-' + file.originalname);
        }

    })
})

profile = profileUploads.single('profile')

module.exports = {
    profile
}