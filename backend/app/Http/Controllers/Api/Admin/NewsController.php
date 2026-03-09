<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\News;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;

class NewsController extends Controller
{
    /**
     * GET /api/admin/news
     * List all news
     */
    public function index(Request $request)
    {
        $query = News::with('author:id,fullname');

        if ($request->filled('search')) {
            $keyword = $request->search;
            $query->where('title', 'like', "%{$keyword}%");
        }

        $news = $query->latest()->paginate(15);

        return response()->json([
            'status' => 'success',
            'data'   => $news
        ]);
    }

    /**
     * POST /api/admin/news
     * Create new news
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title'       => 'required|string|max:255',
            'summary'     => 'nullable|string|max:500',
            'content'     => 'required|string',
            'thumbnail'   => 'nullable|string',
            'is_featured' => 'boolean',
            'is_active'   => 'boolean',
            'published_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Dữ liệu không hợp lệ.',
                'errors'  => $validator->errors()
            ], 422);
        }

        try {
            $data = $request->all();
            $data['author_id'] = $request->user()->id;
            $data['slug'] = Str::slug($request->title) . '-' . uniqid();
            
            if (!$request->filled('published_at')) {
                $data['published_at'] = now();
            }

            $news = News::create($data);

            return response()->json([
                'status'  => 'success',
                'message' => 'Tạo tin tức thành công.',
                'data'    => $news
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Lỗi khi tạo tin tức.',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/admin/news/{id}
     * Show news detail
     */
    public function show($id)
    {
        try {
            $news = News::findOrFail($id);
            return response()->json([
                'status' => 'success',
                'data'   => $news
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không tìm thấy tin tức.'
            ], 404);
        }
    }

    /**
     * PUT /api/admin/news/{id}
     * Update news
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'title'       => 'string|max:255',
            'summary'     => 'nullable|string|max:500',
            'content'     => 'string',
            'thumbnail'   => 'nullable|string',
            'is_featured' => 'boolean',
            'is_active'   => 'boolean',
            'published_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Dữ liệu không hợp lệ.',
                'errors'  => $validator->errors()
            ], 422);
        }

        try {
            $news = News::findOrFail($id);
            $data = $request->all();
            
            if ($request->filled('title') && $request->title !== $news->title) {
                $data['slug'] = Str::slug($request->title) . '-' . uniqid();
            }

            $news->update($data);

            return response()->json([
                'status'  => 'success',
                'message' => 'Cập nhật tin tức thành công.',
                'data'    => $news
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Lỗi khi cập nhật tin tức.',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    /**
     * DELETE /api/admin/news/{id}
     * Delete news
     */
    public function destroy($id)
    {
        try {
            $news = News::findOrFail($id);
            $news->delete();

            return response()->json([
                'status'  => 'success',
                'message' => 'Đã xóa tin tức.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Lỗi khi xóa tin tức.'
            ], 500);
        }
    }
}
