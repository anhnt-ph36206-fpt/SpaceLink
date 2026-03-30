<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductSpecification extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'spec_group_id',
        'name',
        'value',
        'display_order',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function specGroup()
    {
        return $this->belongsTo(SpecGroup::class);
    }
}
