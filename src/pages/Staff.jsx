import { useState } from "react";
import { PageHeader, StatusBadge } from "../components/UI";
import { staff as initialStaff } from "../data/mockData";
import { IconPlus } from "../components/Icons";

export default function Staff() {
  const [list] = useState(initialStaff);

  return (
    <div>
      

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Shift</th>
                <th>Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>{s.role}</td>
                  <td>{s.shift}</td>
                  <td>{s.phone}</td>
                  <td><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
