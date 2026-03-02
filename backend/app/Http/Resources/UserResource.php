<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->fullname,
            'email' => $this->email,
            'phone' => $this->phone,
            'gender' => $this->gender,
            'avatar' => $this->avatar,
            'status' => $this->status,
            'role' => $this->whenLoaded('role', function() {
                 return $this->role->name; // Chỉ lấy tên role
            }),
            // Tự động nhúng AddressResource vào nếu có load relations
            'addresses' => AddressResource::collection($this->whenLoaded('addresses')),
            'joined_at' => $this->created_at->format('d-m-Y'),
        ];
    }
}