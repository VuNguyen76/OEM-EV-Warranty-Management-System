export class BaseEntity {
    constructor() {
        this.id = id;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.note = note;
        this.status = status;
    }
    getId() {
        return this.id;
    }
    getCreatedAt() {
        return this.createdAt;
    }
    getUpdatedAt() {
        return this.updatedAt;
    }
    getNote() {
        return this.note;
    }
    getStatus() {
        return this.status;
    }
    setId(id) {
        this.id = id;
    }
    setCreatedAt(createdAt) {
        this.createdAt = createdAt;
    }
    setUpdatedAt(updatedAt) {
        this.updatedAt = updatedAt;
    }
    setNote(note) {
        this.note = note;
    }
    setStatus(status) {
        this.status = status;
    }
}