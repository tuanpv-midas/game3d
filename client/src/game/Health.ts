import * as THREE from 'three';

export class HealthSystem {
  private maxHealth: number;
  private currentHealth: number;
  private armor: number;
  private isDestroyed: boolean;

  constructor(maxHealth: number = 100) {
    this.maxHealth = maxHealth;
    this.currentHealth = maxHealth;
    this.armor = 0;
    this.isDestroyed = false;
  }

  public takeDamage(amount: number): boolean {
    const actualDamage = Math.max(1, amount - this.armor);
    this.currentHealth = Math.max(0, this.currentHealth - actualDamage);
    
    if (this.currentHealth <= 0 && !this.isDestroyed) {
      this.isDestroyed = true;
      return true; // Signal destruction
    }
    return false;
  }

  public heal(amount: number) {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
  }

  public addArmor(amount: number) {
    this.armor = Math.min(50, this.armor + amount); // Max armor is 50
  }

  public getHealth(): number {
    return this.currentHealth;
  }

  public getArmor(): number {
    return this.armor;
  }

  public isAlive(): boolean {
    return this.currentHealth > 0;
  }
}
