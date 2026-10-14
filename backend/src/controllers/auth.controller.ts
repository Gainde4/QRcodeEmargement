import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db, config } from '../config';

export class AuthController {
  /**
   * Connexion / Authentification SSO simulée pour étudiants et surveillants
   */
  public static async login(req: Request, res: Response) {
    const { email, studentNumber } = req.body;

    try {
      let userQuery = 'SELECT id, student_number, first_name, last_name, email, role FROM users WHERE ';
      const params: any[] = [];

      if (studentNumber) {
        userQuery += 'student_number = $1';
        params.push(studentNumber);
      } else if (email) {
        userQuery += 'email = $1';
        params.push(email);
      } else {
        return res.status(400).json({ error: 'Fournir un email ou un numéro étudiant' });
      }

      const userRes = await db.query(userQuery, params);

      if (userRes.rowCount === 0) {
        return res.status(404).json({ error: 'Utilisateur introuvable dans le référentiel universitaire' });
      }

      const user = userRes.rows[0];

      // Génération du Token JWT
      const token = jwt.sign(
        {
          id: user.id,
          studentNumber: user.student_number,
          role: user.role,
          name: `${user.first_name} ${user.last_name}`,
        },
        config.jwtSecret,
        { expiresIn: '12h' }
      );

      return res.json({
        token,
        user: {
          id: user.id,
          studentNumber: user.student_number,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Liste les comptes de démonstration pour tester immédiatement
   */
  public static async getDemoAccounts(req: Request, res: Response) {
    try {
      const users = await db.query(
        `SELECT id, student_number, first_name, last_name, email, role FROM users ORDER BY role, first_name`
      );
      return res.json({ users: users.rows });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
