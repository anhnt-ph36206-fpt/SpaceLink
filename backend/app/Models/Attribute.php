<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attribute extends Model
{
    protected $fillable = [
        'attribute_group_id',
        'value',
        'color_code',
        'display_order',
    ];

    /**
     * Relationships
     */

    public function attributeGroup()
    {
        return $this->belongsTo(AttributeGroup::class);
    }
}
