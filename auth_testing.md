# Auth Testing Notes

Admin: admin@sinav.com / admin123 (role admin)
Demo user: demo@sinav.com / demo123 (role user, has history + results)
Filler: user1@sinav.com..user5@sinav.com / user123

Auth uses JWT in localStorage (key: netor_token) sent as Authorization: Bearer.
Endpoints under /api/auth: register, login, logout, me, forgot-password, reset-password.
Also PUT /api/profile.

Login returns {user, token}. Frontend stores token in localStorage.
