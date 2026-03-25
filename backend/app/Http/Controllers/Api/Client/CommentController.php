<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCommentRequest;
use App\Http\Requests\UpdateCommentRequest;
use App\Http\Resources\CommentResource;
use App\Models\Comment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;


class CommentController extends Controller
{
    public function index(Request $request, int $productId): JsonResponse
    {
        $perPage = min($request->integer('per_page', 10), 50);

        $comments = Comment::with(['user:id,fullname,avatar', 'replies'])
            ->forProduct($productId)
            ->approved()
            ->topLevel()
            ->withCount('replies')
            ->latest()
            ->paginate($perPage);

        return response()->json([
            'data' => CommentResource::collection($comments),
            'meta' => [
                'current_page' => $comments->currentPage(),
                'last_page'    => $comments->lastPage(),
                'per_page'     => $comments->perPage(),
                'total'        => $comments->total(),
            ],
        ]);
    }

    public function store(StoreCommentRequest $request): JsonResponse
    {
        $data = $request->validated();

        $comment = Comment::create([
            'product_id' => $data['product_id'],
            'content'    => $data['content'],
            'parent_id'  => $data['parent_id'] ?? null,
            'user_id'    => auth()->id(),
            'status'     => 'pending',
        ]);

        $comment->load('user:id,fullname,avatar');

        return response()->json([
            'message' => 'Bình luận đã được gửi, đang chờ duyệt.',
            'data'    => new CommentResource($comment),
        ], 201);
    }

    public function show(Comment $comment): JsonResponse
    {
        $comment->load(['user:id,fullname,avatar', 'replies']);

        return response()->json([
            'data' => new CommentResource($comment),
        ]);
    }

    /**
     * GET /api/comments/{comment}/replies?page=1&per_page=10
     * Trả về replies phân trang của 1 comment gốc.
     */
    public function replies(Request $request, Comment $comment): JsonResponse
    {
        $perPage = min($request->integer('per_page', 10), 50);

        $replies = Comment::with('user:id,fullname,avatar')
            ->where('parent_id', $comment->id)
            ->where('is_hidden', false)
            ->where('status', 'approved')
            ->latest()
            ->paginate($perPage);

        return response()->json([
            'data' => CommentResource::collection($replies),
            'meta' => [
                'current_page' => $replies->currentPage(),
                'last_page'    => $replies->lastPage(),
                'per_page'     => $replies->perPage(),
                'total'        => $replies->total(),
            ],
        ]);
    }

    public function update(UpdateCommentRequest $request, Comment $comment): JsonResponse
    {
        $user = auth()->user();

        if ($user->id !== $comment->user_id && !$user->is_admin) {
            return response()->json(['message' => 'Bạn không có quyền cập nhật bình luận này.'], 403);
        }

        $comment->update([
            'content' => $request->validated('content'),
            'status'  => 'pending',
        ]);

        $comment->load('user:id,fullname,avatar');

        return response()->json([
            'message' => 'Cập nhật bình luận thành công, đang chờ duyệt lại.',
            'data'    => new CommentResource($comment),
        ]);
    }

    public function destroy(Comment $comment): JsonResponse
    {
        $user = auth()->user();

        if ($user->id !== $comment->user_id && !$user->is_admin) {
            return response()->json(['message' => 'Bạn không có quyền xoá bình luận này.'], 403);
        }

        // Soft delete — bản ghi vẫn còn trong DB với deleted_at được set
        $comment->delete();

        return response()->json(['message' => 'Đã xoá bình luận thành công.']);
    }
}
