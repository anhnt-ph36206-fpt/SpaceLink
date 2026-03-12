<?php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttributeGroupResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'name'          => $this->name,
            'display_name'  => $this->display_name,
            'display_order' => $this->display_order,
            'attributes'    => $this->whenLoaded('attributes', function () {
                return $this->attributes->map(fn($a) => [
                    'id'            => $a->id,
                    'value'         => $a->value,
                    'color_code'    => $a->color_code,
                    'display_order' => $a->display_order,
                ]);
            }),
        ];
    }
}
