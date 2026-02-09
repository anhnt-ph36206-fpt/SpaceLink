<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Permission extends Model
{
    protected $fillable = [
        'name',
        'display_name',
        'group_name',
    ];

    /**
     * Relationships
     */

    // Permission belongs to many roles
    public function roles()
    {
        return $this->belongsToMany(Role::class, 'role_permissions');
    }
}