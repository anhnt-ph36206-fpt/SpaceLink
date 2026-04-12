<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'content'    => $this->content,
            'status'     => $this->status,
            'is_hidden'  => $this->is_hidden,
            'created_at' => $this->created_at->toDateTimeString(),
            'updated_at' => $this->updated_at->toDateTimeString(),

            'user' => [
                'id'       => $this->resource->relationLoaded('user') && $this->user ? $this->user->id       : null,
                'fullname' => $this->resource->relationLoaded('user') && $this->user ? $this->user->fullname : '',
                'avatar'   => $this->resource->relationLoaded('user') && $this->user ? $this->user->avatar   : null,
                'is_admin' => $this->resource->relationLoaded('user') && $this->user ? ($this->user->role_id === 1) : false,
            ],

            'product_id' => $this->product_id,
            'parent_id'  => $this->parent_id,

            'product'    => $this->when(
                $this->resource->relationLoaded('product') && $this->product,
                fn() => ['id' => $this->product->id, 'name' => $this->product->name]
            ),

            'replies'       => CommentResource::collection($this->whenLoaded('replies')),
            'allReplies'    => CommentResource::collection($this->whenLoaded('allReplies')),
            'replies_count' => $this->when(
                isset($this->replies_count),
                $this->replies_count
            ),
        ];
    }
}
