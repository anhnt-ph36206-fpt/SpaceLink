<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

/*
|--------------------------------------------------------------------------
| Storage file fallback (Windows dev server fix)
|--------------------------------------------------------------------------
| PHP built-in server (php artisan serve) on Windows cannot follow NTFS
| Junction symlinks. This route serves files from storage/app/public
| directly, with proper MIME type and cache headers.
*/
Route::get('/storage/{path}', function (string $path) {
    $fullPath = storage_path('app/public/' . $path);

    if (!file_exists($fullPath)) {
        abort(404);
    }

    $mime = mime_content_type($fullPath) ?: 'application/octet-stream';

    return response()->file($fullPath, [
        'Content-Type' => $mime,
        'Cache-Control' => 'public, max-age=86400',
    ]);
})->where('path', '.*');
