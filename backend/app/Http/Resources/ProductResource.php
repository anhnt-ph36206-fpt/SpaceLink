<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'sku' => $this->sku,
            'description' => $this->description,
            'content' => $this->content,
            'price' => $this->price,
            'sale_price' => $this->sale_price,
            'quantity' => $this->quantity,
            'sold_count' => $this->sold_count,
            'view_count' => $this->view_count,
            'is_featured' => $this->is_featured,
            'is_active' => $this->is_active,
            'category' => $this->whenLoaded('category'),
            'brand' => $this->whenLoaded('brand'),
            'images' => $this->whenLoaded('images'),
            'variants' => $this->whenLoaded('variants', function () {
                return $this->variants->map(function ($variant) {
                    return [
                        'id' => $variant->id,
                        'sku' => $variant->sku,
                        'price' => $variant->price,
                        'sale_price' => $variant->sale_price,
                        'quantity' => $variant->quantity,
                        'image' => $variant->image,
                        'attributes' => $variant->attributes->map(function ($attr) {
                            return [
                                'id' => $attr->id,
                                'value' => $attr->value,
                                'color_code' => $attr->color_code,
                                'group' => $attr->attributeGroup ? $attr->attributeGroup->name : null,
                            ];
                        }),
                    ];
                });
            }),
            'created_at' => $this->created_at->format('d-m-Y H:i:s'),
        ];
    }
}
