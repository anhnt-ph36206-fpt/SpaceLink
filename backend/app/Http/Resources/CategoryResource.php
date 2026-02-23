<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * Lưu ý:
     * - image & icon được trả về dưới dạng Absolute URL.
     * - parent được bọc trong CategoryResource để đồng nhất format.
     * - children được đệ quy qua CategoryResource::collection.
     * - display_order được gộp vào object "meta".
     * - Không trả về created_at, updated_at, deleted_at.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'slug'        => $this->slug,

            // Absolute URL: trả null nếu trường rỗng
            'image'       => $this->image ? url('storage/' . $this->image) : null,
            'icon'        => $this->icon  ? url('storage/' . $this->icon)  : null,

            'description' => $this->description,
            'parent_id'   => $this->parent_id,

            // Bọc parent vào Resource để đồng nhất format trả về
            // Chỉ xuất hiện khi relationship được Eager Load
            'parent'      => new CategoryResource($this->whenLoaded('parent')),

            // Đệ quy: chỉ xuất hiện khi relationship được Eager Load
            'children'    => CategoryResource::collection($this->whenLoaded('children')),

            // Gộp display_order vào meta, tách biệt khỏi các trường chính
            'meta'        => [
                'display_order' => $this->display_order,
            ],
        ];
    }
}