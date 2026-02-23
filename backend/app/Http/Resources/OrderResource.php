<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'order_code'   => $this->order_code,

            // Thông tin khách hàng
            'user'         => $this->whenLoaded('user', fn() => [
                'id'       => $this->user?->id,
                'fullname' => $this->user?->fullname,
                'email'    => $this->user?->email,
                'phone'    => $this->user?->phone,
            ]),

            // Địa chỉ giao hàng (snapshot)
            'shipping' => [
                'name'     => $this->shipping_name,
                'phone'    => $this->shipping_phone,
                'email'    => $this->shipping_email,
                'province' => $this->shipping_province,
                'district' => $this->shipping_district,
                'ward'     => $this->shipping_ward,
                'address'  => $this->shipping_address,
            ],

            // Tài chính
            'subtotal'        => (float) $this->subtotal,
            'discount_amount' => (float) $this->discount_amount,
            'shipping_fee'    => (float) $this->shipping_fee,
            'total_amount'    => (float) $this->total_amount,

            // Trạng thái
            'status'          => $this->status,
            'payment_status'  => $this->payment_status,
            'payment_method'  => $this->payment_method,

            // Voucher
            'voucher_code'     => $this->voucher_code,
            'voucher_discount' => (float) $this->voucher_discount,

            // Ghi chú
            'note'             => $this->note,
            'admin_note'       => $this->admin_note,

            // Hủy đơn
            'cancelled_reason' => $this->cancelled_reason,
            'cancelled_at'     => $this->cancelled_at?->format('d-m-Y H:i:s'),

            // Shipping extra
            'shipping_partner'    => $this->shipping_partner,
            'tracking_code'       => $this->tracking_code,
            'estimated_delivery'  => $this->estimated_delivery?->format('d-m-Y H:i:s'),

            // Timestamps trạng thái
            'confirmed_at'  => $this->confirmed_at?->format('d-m-Y H:i:s'),
            'shipped_at'    => $this->shipped_at?->format('d-m-Y H:i:s'),
            'delivered_at'  => $this->delivered_at?->format('d-m-Y H:i:s'),
            'completed_at'  => $this->completed_at?->format('d-m-Y H:i:s'),
            'created_at'    => $this->created_at?->format('d-m-Y H:i:s'),
            'updated_at'    => $this->updated_at?->format('d-m-Y H:i:s'),

            // Relations (chỉ load khi được eager load)
            'items'          => OrderItemResource::collection($this->whenLoaded('items')),
            'status_history' => $this->whenLoaded('statusHistory', fn() =>
                $this->statusHistory->map(fn($h) => [
                    'from'       => $h->from_status,
                    'to'         => $h->to_status,
                    'note'       => $h->note,
                    'changed_by' => $h->changed_by,
                    'created_at' => $h->created_at?->format('d-m-Y H:i:s'),
                ])
            ),
        ];
    }
}
