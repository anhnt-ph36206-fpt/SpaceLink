<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SpecGroup extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'display_name',
        'display_order',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function specifications()
    {
        return $this->hasMany(ProductSpecification::class);
    }
}
