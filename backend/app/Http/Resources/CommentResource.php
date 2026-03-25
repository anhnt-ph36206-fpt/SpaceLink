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
                'id'     => $this->resource->relationLoaded('user') && $this->user ? $this->user->id : null,
                'name'   => $this->resource->relationLoaded('user') && $this->user ? $this->user->fullname : '',
                'avatar' => $this->resource->relationLoaded('user') && $this->user ? $this->user->avatar : null,
            ],

            'product_id' => $this->product_id,
            'parent_id'  => $this->parent_id,

            'replies'       => CommentResource::collection($this->whenLoaded('replies')),
            'replies_count' => $this->when(
                isset($this->replies_count),
                $this->replies_count
            ),
        ];
    }
}
