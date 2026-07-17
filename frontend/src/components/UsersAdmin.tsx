import { Fragment, FormEvent, useEffect, useState } from "react";
import { AppUser, listUsers, createUser, updateUser } from "../api";
import { UNITS } from "../units";
import { Button } from "./Button";

const ROLES = [
  { value: "viewer", label: "Viewer (solo lectura de sus unidades)" },
  { value: "admin", label: "Admin (todo + carga + usuarios)" },
];

const toggle = (arr: string[], id: string) =>
  arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

export function UsersAdmin() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  // alta
  const [nu, setNu] = useState({ username: "", full_name: "", password: "", role: "viewer", units: [] as string[] });
  const [creating, setCreating] = useState(false);

  // edición por fila
  const [editUser, setEditUser] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("viewer");
  const [editUnits, setEditUnits] = useState<string[]>([]);
  const [editPass, setEditPass] = useState("");
  const [editName, setEditName] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setUsers(await listUsers()); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(""), 4000); };

  const submitNew = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true); setError("");
    try {
      await createUser({
        username: nu.username.trim(), password: nu.password, role: nu.role,
        full_name: nu.full_name || null, units: nu.role === "admin" ? [] : nu.units,
      });
      flash(`Usuario "${nu.username.trim()}" creado.`);
      setNu({ username: "", full_name: "", password: "", role: "viewer", units: [] });
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setCreating(false); }
  };

  const startEdit = (u: AppUser) => {
    setEditUser(u.username); setEditRole(u.role); setEditUnits(u.units || []);
    setEditPass(""); setEditName(u.full_name || "");
  };
  const saveEdit = async () => {
    setError("");
    try {
      const body: { role: string; units: string[]; full_name: string; password?: string } = {
        role: editRole, units: editRole === "admin" ? [] : editUnits,
        full_name: editName,  // "" limpia el nombre
      };
      if (editPass) body.password = editPass;
      await updateUser(editUser!, body);
      flash(`"${editUser}" actualizado.`); setEditUser(null); await load();
    } catch (e) { setError((e as Error).message); }
  };
  const toggleActive = async (u: AppUser) => {
    setError("");
    try { await updateUser(u.username, { active: !u.active }); await load(); }
    catch (e) { setError((e as Error).message); }
  };

  return (
    <div className="admin-users">
      {/* alta de usuario */}
      <form className="card admin-form" onSubmit={submitNew}>
        <div className="card__title">Nuevo usuario</div>
        <div className="admin-form__grid">
          <label className="kpi-in"><span>Usuario (correo)</span>
            <input value={nu.username} autoComplete="off"
              onChange={(e) => setNu({ ...nu, username: e.target.value })} required /></label>
          <label className="kpi-in"><span>Nombre</span>
            <input value={nu.full_name} onChange={(e) => setNu({ ...nu, full_name: e.target.value })} /></label>
          <label className="kpi-in"><span>Contraseña</span>
            <input type="password" value={nu.password} autoComplete="new-password"
              onChange={(e) => setNu({ ...nu, password: e.target.value })} required /></label>
          <label className="kpi-in"><span>Rol</span>
            <select value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value })}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select></label>
        </div>
        {nu.role === "viewer" && (
          <div className="admin-units">
            <span className="admin-units__lbl">Unidades visibles:</span>
            {UNITS.map((u) => (
              <label key={u.id} className="admin-units__chk">
                <input type="checkbox" checked={nu.units.includes(u.id)}
                  onChange={() => setNu({ ...nu, units: toggle(nu.units, u.id) })} /> {u.label}
              </label>
            ))}
          </div>
        )}
        <div className="admin-form__foot">
          <Button variant="primary" type="submit" disabled={creating || !nu.username || !nu.password}>
            {creating ? "Creando…" : "Crear usuario"}
          </Button>
          {msg && <span className="upload__msg upload__msg--ok">{msg}</span>}
          {error && <span className="upload__msg upload__msg--err">{error}</span>}
        </div>
      </form>

      {/* listado */}
      <div className="card">
        <div className="card__title">Usuarios ({users.length})</div>
        {loading ? <div className="state">Cargando…</div> : (
          <table className="admin-table">
            <thead>
              <tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Unidades</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <Fragment key={u.username}>
                  <tr className={u.active ? "" : "admin-row--off"}>
                    <td>{u.username}</td>
                    <td>{u.full_name || "—"}</td>
                    <td>{u.is_admin ? "admin" : "viewer"}</td>
                    <td>{u.is_admin ? "TODAS" : (u.units.join(", ") || "—")}</td>
                    <td>{u.active ? "activo" : "inactivo"}</td>
                    <td className="admin-actions">
                      <Button variant="ghost" size="sm"
                        onClick={() => (editUser === u.username ? setEditUser(null) : startEdit(u))}>Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(u)}>
                        {u.active ? "Desactivar" : "Activar"}</Button>
                    </td>
                  </tr>
                  {editUser === u.username && (
                    <tr className="admin-edit-row"><td colSpan={6}>
                      <div className="admin-edit">
                        <label className="kpi-in"><span>Nombre</span>
                          <input value={editName} placeholder="vacío = sin nombre"
                            onChange={(e) => setEditName(e.target.value)} /></label>
                        <label className="kpi-in"><span>Rol</span>
                          <select value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select></label>
                        {editRole === "viewer" && (
                          <div className="admin-units">
                            <span className="admin-units__lbl">Unidades:</span>
                            {UNITS.map((un) => (
                              <label key={un.id} className="admin-units__chk">
                                <input type="checkbox" checked={editUnits.includes(un.id)}
                                  onChange={() => setEditUnits(toggle(editUnits, un.id))} /> {un.label}
                              </label>
                            ))}
                          </div>
                        )}
                        <label className="kpi-in"><span>Nueva clave (opcional)</span>
                          <input type="password" value={editPass} autoComplete="new-password"
                            placeholder="vacío = no cambiar" onChange={(e) => setEditPass(e.target.value)} /></label>
                        <div className="admin-edit__foot">
                          <Button variant="primary" size="sm" onClick={saveEdit}>Guardar cambios</Button>
                          <Button variant="secondary" size="sm" onClick={() => setEditUser(null)}>Cancelar</Button>
                        </div>
                      </div>
                    </td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
