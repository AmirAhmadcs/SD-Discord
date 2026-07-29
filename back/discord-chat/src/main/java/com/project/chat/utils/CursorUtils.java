package com.project.chat.utils;

import java.util.Base64;

public class CursorUtils {

    // ترکیب زمان و آیدی و تبدیل به Base64 (مثلاً: 168000000_105 -> Base64)
    public static String encodeCursor(Long time, Long id) {
        if (time == null || id == null) return null;
        String rawCursor = time + "_" + id;
        return Base64.getEncoder().encodeToString(rawCursor.getBytes());
    }

    // باز کردن Base64 و استخراج زمان و آیدی
    public static long[] decodeCursor(String encodedCursor) {
        if (encodedCursor == null || encodedCursor.isEmpty()) return null;
        try {
            String rawCursor = new String(Base64.getDecoder().decode(encodedCursor));
            String[] parts = rawCursor.split("_");
            return new long[]{Long.parseLong(parts[0]), Long.parseLong(parts[1])};
        } catch (Exception e) {
            // اگر فرانت‌اند یه کرسر چرت و پرت فرستاد، کلاً نادیده‌اش می‌گیریم
            return null;
        }
    }
}