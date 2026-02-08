<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AddressResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'full_address' => $this->detail_address . ', ' . $this->ward . ', ' . $this->district . ', ' . $this->province,
            'details' => [
                'province' => $this->province,
                'district' => $this->district,
                'ward' => $this->ward,
                'specific' => $this->detail_address,
            ],
            'is_default' => $this->is_default,
        ];
    }
}