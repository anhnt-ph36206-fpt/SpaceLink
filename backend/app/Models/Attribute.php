<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;


class AttributeGroup extends Model
{
    protected $fillable = [
        'name',
        'display_name',
        'display_order',
    ];

    /**
     * Relationships
     */

    // AttributeGroup has many attributes
    public function attributes()
    {
        return $this->hasMany(Attribute::class);
    }
}