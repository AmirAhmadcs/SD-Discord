package com.project.media.service;

import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MediaService {

    private final MinioClient minioClient;

    @Value("${minio.bucket-name}")
    private String bucketName;

    public String uploadFile(MultipartFile file) {
        try {
            // ساخت یک اسم کاملاً یکتا برای جلوگیری از تداخل (Overwrite) فایل‌های هم‌نام
            String originalFileName = file.getOriginalFilename();
            String safeFileName = originalFileName != null ? originalFileName.replaceAll("\\s+", "_") : "unknown";
            String uniqueFileName = UUID.randomUUID().toString() + "_" + safeFileName;

            InputStream inputStream = file.getInputStream();

            // شلیک کردن فایل به سمت سرور MinIO
            minioClient.putObject(
                PutObjectArgs.builder()
                    .bucket(bucketName)
                    .object(uniqueFileName)
                    .stream(inputStream, file.getSize(), -1)
                    .contentType(file.getContentType())
                    .build()
            );

            // برگرداندن نامِ نهایی فایل برای ذخیره در دیتابیس (مثل ماژول Auth یا Chat)
            return uniqueFileName;

        } catch (Exception e) {
            throw new RuntimeException("Failed to upload file to MinIO: " + e.getMessage());
        }
    }

    public InputStream getFile(String fileName) {
        try {
            return minioClient.getObject(
                GetObjectArgs.builder()
                    .bucket(bucketName)
                    .object(fileName)
                    .build()
            );
        } catch (Exception e) {
            throw new RuntimeException("Error fetching file from MinIO: " + e.getMessage());
        }
    }

    public void deleteFile(String fileName) {
        try {
            minioClient.removeObject(
                RemoveObjectArgs.builder()
                    .bucket(bucketName)
                    .object(fileName)
                    .build()
            );
        } catch (Exception e) {
            throw new RuntimeException("Error deleting file from MinIO: " + e.getMessage());
        }
    }
}