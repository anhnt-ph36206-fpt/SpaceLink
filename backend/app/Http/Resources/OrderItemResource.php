<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'product_id'    => $this->product_id,
            'variant_id'    => $this->variant_id,
            'product_name'  => $this->product_name,
            'product_image' => $this->product_image,
            'product_sku'   => $this->product_sku,
            'variant_info'  => $this->variant_info, // array (auto cast)
            'price'         => (float) $this->price,
            'quantity'      => $this->quantity,
            'total'         => (float) $this->total,
            'is_reviewed'   => $this->is_reviewed,
        ];
    }
}
