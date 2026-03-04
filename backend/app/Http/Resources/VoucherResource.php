<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VoucherResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                   => $this->id,
            'code'                 => $this->code,
            'name'                 => $this->name,
            'description'          => $this->description,
            'discount_type'        => $this->discount_type,
            'discount_value'       => (float) $this->discount_value,
            'max_discount'         => $this->max_discount !== null ? (float) $this->max_discount : null,
            'min_order_amount'     => (float) $this->min_order_amount,
            'quantity'             => $this->quantity,
            'used_count'           => $this->used_count,
            'usages_count'         => $this->whenCounted('usages'),
            'usage_limit_per_user' => $this->usage_limit_per_user,
            'start_date'           => $this->start_date?->format('Y-m-d H:i:s'),
            'end_date'             => $this->end_date?->format('Y-m-d H:i:s'),
            'is_active'            => (bool) $this->is_active,
            'is_expired'           => now()->gt($this->end_date),
            'remaining_uses'       => $this->quantity !== null
                ? max(0, $this->quantity - $this->used_count)
                : null,
            'created_at'           => $this->created_at?->format('d-m-Y H:i:s'),
            'updated_at'           => $this->updated_at?->format('d-m-Y H:i:s'),
        ];
    }
}
