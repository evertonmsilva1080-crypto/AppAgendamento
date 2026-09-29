const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '../../.env')
});

const {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand
} = require('@aws-sdk/client-s3');

const BUCKET_NAME = process.env.AWS_S3_BUCKET;
const AWS_REGION = process.env.AWS_REGION;

console.log('AWS CONFIG:');
console.log('Bucket:', BUCKET_NAME);
console.log('Region:', AWS_REGION);

const s3 = new S3Client({
    region: AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

module.exports = {

    async uploadToS3(file, filename) {
        try {

            console.log('Tentando enviar para bucket:', BUCKET_NAME);

            const command = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: filename,
                Body: file.data,
                ContentType: file.mimetype
            });

            await s3.send(command);

            const location = `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${filename}`;

            console.log('Arquivo enviado para S3:');
            console.log(location);

            return {
                error: false,
                message: {
                    Location: location
                }
            };

        } catch (err) {

            console.error('Erro ao enviar para S3:', err);

            return {
                error: true,
                message: err.message
            };
        }
    },

    async deleteFileS3(key) {
        try {

            const command = new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key
            });

            await s3.send(command);

            return {
                error: false,
                message: 'Arquivo excluído com sucesso.'
            };

        } catch (err) {

            console.error('Erro ao excluir arquivo do S3:', err);

            return {
                error: true,
                message: err.message
            };
        }
    }

};