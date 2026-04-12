<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CommentResource;
use App\Models\Comment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;


class CommentController extends Controller
{
    
    public function index(Request $request): JsonResponse
    {
        $comments = Comment::with([
                'user:id,fullname,avatar,role_id',
                'product:id,name',
                'allReplies.user:id,fullname,avatar,role_id',
            ])
            ->whereNull('parent_id') // only top-level questions
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->product_id, fn($q) => $q->where('product_id', $request->product_id))
            ->when($request->keyword, fn($q) => $q->where('content', 'like', '%' . $request->keyword . '%'))
            ->when($request->is_hidden !== null && $request->is_hidden !== '', fn($q) => $q->where('is_hidden', filter_var($request->is_hidden, FILTER_VALIDATE_BOOLEAN)))
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return response()->json([
            'data' => CommentResource::collection($comments),
            'meta' => [
                'current_page' => $comments->currentPage(),
                'last_page'    => $comments->lastPage(),
                'total'        => $comments->total(),
                'pending'      => Comment::where('status', 'pending')->count(),
            ],
        ]);
    }

    public function show(Comment $comment): JsonResponse
    {
        $comment->load([
            'user:id,fullname,avatar,role_id',
            'product:id,name',
            'allReplies.user:id,fullname,avatar,role_id',
        ]);

        return response()->json(['data' => new CommentResource($comment)]);
    }

    
    public function approve(Comment $comment): JsonResponse
    {
        $comment->update(['status' => 'approved', 'is_hidden' => false]);

        return response()->json([
            'message' => 'Đã duyệt bình luận thành công.',
            'data'    => new CommentResource($comment),
        ]);
    }

    
    public function reject(Comment $comment): JsonResponse
    {
        $comment->update(['status' => 'rejected']);

        return response()->json([
            'message' => 'Đã từ chối bình luận.',
            'data'    => new CommentResource($comment),
        ]);
    }

    
    public function toggleHide(Comment $comment): JsonResponse
    {
        $comment->update(['is_hidden' => !$comment->is_hidden]);

        $msg = $comment->is_hidden ? 'Đã ẩn bình luận.' : 'Đã hiện bình luận.';

        return response()->json([
            'message'   => $msg,
            'is_hidden' => $comment->is_hidden,
        ]);
    }

    
    public function destroy(Comment $comment): JsonResponse
    {
        $comment->delete();

        return response()->json(['message' => 'Đã xoá bình luận thành công.']);
    }
}
