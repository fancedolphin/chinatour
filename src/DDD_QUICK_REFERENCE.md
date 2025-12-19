# 🚀 DDD Architecture Quick Reference

## 📌 快速查找表

### 我应该把代码放在哪里？

| 代码类型 | 放置位置 | 示例 |
|---------|---------|------|
| 业务实体、规则 | `domain/entities/` | `Trip.ts`, `User.ts` |
| 数据访问接口 | `domain/repositories/` | `ITripRepository.ts` |
| 跨实体逻辑 | `domain/services/` | `TripPlanningService.ts` |
| 用例、业务流程 | `application/use-cases/` | `CreateTripUseCase.ts` |
| 数据传输对象 | `application/use-cases/` | `CreateTripInput`, `CreateTripOutput` |
| 数据访问实现 | `infrastructure/repositories/` | `TripRepository.ts` |
| 外部服务 | `infrastructure/services/` | `ShareService.ts` |
| 依赖管理 | `infrastructure/di/` | `Container.ts` |
| React Hooks | `presentation/hooks/` | `useTrips.ts`, `useEmergency.ts` |
| UI组件 | `presentation/components/` | 待迁移 |
| 页面组件 | `presentation/pages/` | 待迁移 |

---

## 🎯 常用代码模板

### 1. 创建新实体 (Domain)

```typescript
// domain/entities/MyEntity.ts
export interface MyEntityInterface {
  id: string;
  name: string;
  
  // 业务方法
  isValid(): boolean;
}

export class MyEntity implements MyEntityInterface {
  constructor(
    public id: string,
    public name: string
  ) {}
  
  isValid(): boolean {
    return this.name.length > 0;
  }
  
  // 验证规则
  static validate(data: Partial<MyEntity>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data.name) {
      errors.push('Name is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // 工厂方法
  static create(data: { name: string }): MyEntity {
    const validation = MyEntity.validate(data);
    if (!validation.valid) {
      throw new Error(`Invalid data: ${validation.errors.join(', ')}`);
    }
    
    return new MyEntity(
      crypto.randomUUID(),
      data.name
    );
  }
}
```

### 2. 创建仓储接口 (Domain)

```typescript
// domain/repositories/IMyRepository.ts
import { MyEntity } from '../entities/MyEntity';

export interface IMyRepository {
  findById(id: string): Promise<MyEntity | null>;
  findAll(): Promise<MyEntity[]>;
  save(entity: MyEntity): Promise<MyEntity>;
  delete(id: string): Promise<boolean>;
}
```

### 3. 实现仓储 (Infrastructure)

```typescript
// infrastructure/repositories/MyRepository.ts
import { MyEntity } from '../../domain/entities/MyEntity';
import { IMyRepository } from '../../domain/repositories/IMyRepository';

export class MyRepository implements IMyRepository {
  private readonly STORAGE_KEY = 'my_entities';
  
  async findById(id: string): Promise<MyEntity | null> {
    const items = this.getAllFromStorage();
    const data = items.find(i => i.id === id);
    return data ? this.deserialize(data) : null;
  }
  
  async findAll(): Promise<MyEntity[]> {
    const items = this.getAllFromStorage();
    return items.map(i => this.deserialize(i));
  }
  
  async save(entity: MyEntity): Promise<MyEntity> {
    const items = this.getAllFromStorage();
    const existingIndex = items.findIndex(i => i.id === entity.id);
    
    if (existingIndex >= 0) {
      items[existingIndex] = this.serialize(entity);
    } else {
      items.push(this.serialize(entity));
    }
    
    this.saveToStorage(items);
    return entity;
  }
  
  async delete(id: string): Promise<boolean> {
    const items = this.getAllFromStorage();
    const filtered = items.filter(i => i.id !== id);
    
    if (filtered.length === items.length) {
      return false;
    }
    
    this.saveToStorage(filtered);
    return true;
  }
  
  private getAllFromStorage(): any[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }
  
  private saveToStorage(items: any[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
  }
  
  private serialize(entity: MyEntity): any {
    return { id: entity.id, name: entity.name };
  }
  
  private deserialize(data: any): MyEntity {
    return new MyEntity(data.id, data.name);
  }
}
```

### 4. 创建Use Case (Application)

```typescript
// application/use-cases/CreateMyEntityUseCase.ts
import { MyEntity } from '../../domain/entities/MyEntity';
import { IMyRepository } from '../../domain/repositories/IMyRepository';

export interface CreateMyEntityInput {
  name: string;
}

export interface CreateMyEntityOutput {
  success: boolean;
  entity?: MyEntity;
  errors?: string[];
}

export class CreateMyEntityUseCase {
  constructor(private repository: IMyRepository) {}
  
  async execute(input: CreateMyEntityInput): Promise<CreateMyEntityOutput> {
    try {
      // 1. 创建实体
      const entity = MyEntity.create({ name: input.name });
      
      // 2. 保存
      const saved = await this.repository.save(entity);
      
      return {
        success: true,
        entity: saved
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}
```

### 5. 注册依赖 (Infrastructure)

```typescript
// infrastructure/di/Container.ts
import { MyRepository } from '../repositories/MyRepository';
import { CreateMyEntityUseCase } from '../../application/use-cases/CreateMyEntityUseCase';

export class DIContainer {
  private myRepository: MyRepository;
  
  constructor() {
    this.myRepository = new MyRepository();
  }
  
  getMyRepository(): MyRepository {
    return this.myRepository;
  }
  
  getCreateMyEntityUseCase(): CreateMyEntityUseCase {
    return new CreateMyEntityUseCase(this.myRepository);
  }
}
```

### 6. 创建Hook (Presentation)

```typescript
// presentation/hooks/useMyEntity.ts
import { useState, useEffect } from 'react';
import { container } from '../../infrastructure/di/Container';
import { MyEntity } from '../../domain/entities/MyEntity';

export function useMyEntity() {
  const [entities, setEntities] = useState<MyEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const repository = container.getMyRepository();
  
  const loadEntities = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const items = await repository.findAll();
      setEntities(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  
  const createEntity = async (name: string) => {
    const useCase = container.getCreateMyEntityUseCase();
    const result = await useCase.execute({ name });
    
    if (result.success) {
      await loadEntities(); // 刷新列表
    }
    
    return result;
  };
  
  useEffect(() => {
    loadEntities();
  }, []);
  
  return {
    entities,
    loading,
    error,
    createEntity,
    refresh: loadEntities
  };
}
```

### 7. 使用Hook (Presentation)

```typescript
// presentation/components/MyComponent.tsx
import { useMyEntity } from '../hooks/useMyEntity';

export function MyComponent() {
  const { entities, loading, error, createEntity } = useMyEntity();
  
  const handleCreate = async () => {
    const result = await createEntity('New Entity');
    
    if (result.success) {
      alert('Created successfully!');
    } else {
      alert(`Error: ${result.errors?.join(', ')}`);
    }
  };
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <button onClick={handleCreate}>Create</button>
      
      {entities.map(entity => (
        <div key={entity.id}>
          {entity.name}
        </div>
      ))}
    </div>
  );
}
```

---

## 🔍 依赖关系速查

### ✅ 允许的导入

```typescript
// ✅ Infrastructure → Domain
import { MyEntity } from '../../domain/entities/MyEntity';
import { IMyRepository } from '../../domain/repositories/IMyRepository';

// ✅ Application → Domain
import { MyEntity } from '../../domain/entities/MyEntity';
import { IMyRepository } from '../../domain/repositories/IMyRepository';

// ✅ Application → Infrastructure (通过DI)
// 在Container中配置，不直接导入

// ✅ Presentation → Application
import { CreateMyEntityUseCase } from '../../application/use-cases/CreateMyEntityUseCase';

// ✅ Presentation → Infrastructure (仅DI Container)
import { container } from '../../infrastructure/di/Container';
```

### ❌ 禁止的导入

```typescript
// ❌ Domain → Infrastructure
import { MyRepository } from '../../infrastructure/repositories/MyRepository'; // 禁止！

// ❌ Domain → Application
import { CreateMyEntityUseCase } from '../../application/use-cases/CreateMyEntityUseCase'; // 禁止！

// ❌ Infrastructure → Application
import { CreateMyEntityUseCase } from '../../application/use-cases/CreateMyEntityUseCase'; // 禁止！
```

---

## 🎓 记忆口诀

### "DDDAI" 原则

- **D**omain - 定义业务规则（Define business rules）
- **D**omain - 不依赖任何层（Don't depend on anything）
- **D**ependency - 依赖注入反转（Dependency Injection）
- **A**pplication - 应用层协调（Application coordinates）
- **I**nfrastructure - 基础设施实现（Infrastructure implements）

### 数据流向记忆

```
UI → Hook → UseCase → DomainService → Repository(Interface) → Repository(Impl) → Storage
```

**记忆点**: 从外到内，从具体到抽象

---

## 📊 文件命名约定

| 类型 | 命名规则 | 示例 |
|-----|---------|------|
| 实体 | PascalCase + .ts | `Trip.ts`, `User.ts` |
| 接口 (Repository) | I + PascalCase + .ts | `ITripRepository.ts` |
| 实现 (Repository) | PascalCase + .ts | `TripRepository.ts` |
| Use Case | PascalCase + UseCase.ts | `CreateTripUseCase.ts` |
| Hook | use + PascalCase.ts | `useTrips.ts` |
| 组件 | PascalCase + .tsx | `MyTripsPage.tsx` |

---

## 🔧 常见问题速查

### Q: 我应该在哪里放业务逻辑？
**A**: Domain Layer (entities或services)

### Q: 我应该在哪里调用API？
**A**: Infrastructure Layer (repositories或services)

### Q: 我应该在哪里定义数据结构？
**A**: Domain Layer (entities) 或 Application Layer (DTOs)

### Q: UI组件可以直接访问Repository吗？
**A**: 不可以！必须通过Hook调用Use Case

### Q: Domain层可以使用React吗？
**A**: 不可以！Domain层必须保持框架无关

### Q: 如何在多个Use Case间共享逻辑？
**A**: 创建Domain Service

---

## 🚀 快速上手流程

1. **创建实体** (`domain/entities/`)
2. **定义仓储接口** (`domain/repositories/`)
3. **实现仓储** (`infrastructure/repositories/`)
4. **创建Use Case** (`application/use-cases/`)
5. **注册依赖** (`infrastructure/di/Container.ts`)
6. **创建Hook** (`presentation/hooks/`)
7. **在组件中使用** (`presentation/components/`)

---

## 📚 相关文档

- [完整架构文档](./ARCHITECTURE.md)
- [迁移指南](./MIGRATION_GUIDE.md)
- [分享功能文档](./SHARE_FEATURES.md)

---

**保持这个文档在手边，随时查阅！** 🎯

**最后更新**: 2025-01-11
