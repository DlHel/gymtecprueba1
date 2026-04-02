const fs = require('fs');
const path = require('path');
const multer = require('multer');

function ensureDirectory(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }
}

const uploadsRoot = path.resolve(__dirname, '../../../uploads');
const reportsDirectory = path.join(uploadsRoot, 'reports');
const modelsDirectory = path.join(uploadsRoot, 'models');

ensureDirectory(modelsDirectory);
ensureDirectory(reportsDirectory);

const storageReports = multer.diskStorage({
    destination(req, file, callback) {
        callback(null, reportsDirectory);
    },
    filename(req, file, callback) {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        callback(null, `report-${uniqueSuffix}.pdf`);
    }
});

const uploadReports = multer({
    storage: storageReports,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter(req, file, callback) {
        if (file.mimetype === 'application/pdf') {
            callback(null, true);
            return;
        }

        callback(new Error('Solo se permiten archivos PDF'));
    }
});

module.exports = {
    ensureDirectory,
    uploadReports,
    uploadsRoot,
    reportsDirectory,
    modelsDirectory
};
