<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_code' => $this->order_code,

            // Thông tin khách hàng
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user?->id,
                'fullname' => $this->user?->fullname,
                'email' => $this->user?->email,
                'phone' => $this->user?->phone,
            ]),

            // Địa chỉ giao hàng (snapshot)
            'shipping' => [
                'fullname' => $this->shipping_name,
                'phone' => $this->shipping_phone,
                'email' => $this->shipping_email,
                'province' => $this->shipping_province,
                'district' => $this->shipping_district,
                'ward' => $this->shipping_ward,
                'address' => $this->shipping_address,
            ],

            // Tài chính
            'subtotal' => (float) $this->subtotal,
            'discount_amount' => (float) $this->discount_amount,
            'shipping_fee' => (float) $this->shipping_fee,
            'total_amount' => (float) $this->total_amount,

            // Trạng thái
            'status' => $this->status,
            'payment_status' => $this->payment_status,
            'payment_method' => $this->payment_method,

            // Voucher
            'voucher_code' => $this->voucher_code,
            'voucher_discount' => (float) $this->voucher_discount,

            // Ghi chú
            'note' => $this->note,
            'admin_note' => $this->admin_note,

            // Hủy đơn
            'cancelled_reason' => $this->cancelled_reason,
            'cancelled_at' => $this->cancelled_at?->format('d-m-Y H:i:s'),

            // Hoàn trả
            'refund_reason' => $this->refund_reason,
            'refund_images' => $this->refund_images,
            'refund_refusal_reason' => $this->refund_refusal_reason,
            'refund_requested_at' => $this->refund_requested_at?->format('d-m-Y H:i:s'),
            'refund_processed_at' => $this->refund_processed_at?->format('d-m-Y H:i:s'),

            // Shipping extra
            'shipping_partner' => $this->shipping_partner,
            'tracking_code' => $this->tracking_code,
            'estimated_delivery' => $this->estimated_delivery?->format('d-m-Y H:i:s'),

            // Timestamps trạng thái
            'confirmed_at' => $this->confirmed_at?->format('d-m-Y H:i:s'),
            'shipped_at' => $this->shipped_at?->format('d-m-Y H:i:s'),
            'delivered_at' => $this->delivered_at?->format('d-m-Y H:i:s'),
            'completed_at' => $this->completed_at?->format('d-m-Y H:i:s'),
            'created_at' => $this->created_at?->format('d-m-Y H:i:s'),
            'updated_at' => $this->updated_at?->format('d-m-Y H:i:s'),

            // Relations (chỉ load khi được eager load)
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'status_history' => $this->whenLoaded('statusHistory', fn () => $this->statusHistory->map(fn ($h) => [
                'from' => $h->from_status,
                'to' => $h->to_status,
                'note' => $h->note,
                'changed_by' => $h->changed_by,
                'created_at' => $h->created_at?->format('d-m-Y H:i:s'),
            ])
            ),
            'product_return' => $this->whenLoaded('productReturn', function () {
                $pr = $this->productReturn;
                if (! $pr) {
                    return null;
                }

                return [
                    'id' => $pr->id,
                    'status' => $pr->status,
                    'reason' => $pr->reason,
                    'reason_for_refusal' => $pr->reason_for_refusal,
                    'refund_amount' => $pr->refund_amount !== null ? (float) $pr->refund_amount : null,
                    'transaction_code' => $pr->transaction_code,
                    'refund_bank' => $pr->refund_bank,
                    'refund_account_name' => $pr->refund_account_name,
                    'refund_account_number' => $pr->refund_account_number,
                    'items' => $pr->items,
                    'evidences' => $pr->relationLoaded('evidences')
                        ? $pr->evidences->map(fn ($e) => [
                            'id' => $e->id,
                            'file_path' => $e->file_path,
                            'file_type' => $e->file_type,
                            'file_url' => $e->file_path ? asset('storage/'.$e->file_path) : null,
                            'created_at' => $e->created_at?->format('d-m-Y H:i:s'),
                        ])->values()->all()
                        : [],
                    'created_at' => $pr->created_at?->format('d-m-Y H:i:s'),
                ];
            }),
            // Yêu cầu hủy đơn (VNPAY đã TT) — chỉ trả record mới nhất
            'cancel_request' => $this->whenLoaded('cancelRequests', function () {
                $cr = $this->cancelRequests->first();
                if (! $cr) return null;
                return [
                    'id'                    => $cr->id,
                    'reason'                => $cr->reason,
                    'refund_bank'           => $cr->refund_bank,
                    'refund_account_name'   => $cr->refund_account_name,
                    'refund_account_number' => $cr->refund_account_number,
                    'status'                => $cr->status,
                    'transaction_code'      => $cr->transaction_code,
                    'admin_note'            => $cr->admin_note,
                    'processed_at'          => $cr->processed_at?->format('d-m-Y H:i:s'),
                    'created_at'            => $cr->created_at?->format('d-m-Y H:i:s'),
                ];
            }),
        ];
    }
}
