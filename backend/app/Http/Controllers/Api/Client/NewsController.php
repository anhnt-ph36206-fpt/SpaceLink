<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\News;
use Illuminate\Http\Request;

class NewsController extends Controller
{
    /**
     * GET /api/client/news
     * Get all active news
     */
    public function index(Request $request)
    {
        $query = News::with('author:id,fullname')
            ->where('is_active', true);

        if ($request->has('is_featured')) {
            $query->where('is_featured', filter_var($request->is_featured, FILTER_VALIDATE_BOOLEAN));
        }

        $news = $query->latest('published_at')->paginate(10);

        return response()->json([
            'status' => 'success',
            'data'   => $news
        ]);
    }

    /**
     * GET /api/client/news/{slug}
     * Get news detail by slug
     */
    public function show($slug)
    {
        try {
            $news = News::with('author:id,fullname')
                ->where('slug', $slug)
                ->where('is_active', true)
                ->firstOrFail();

            // Increment view count
            $news->increment('view_count');

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
}
