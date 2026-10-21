-- CreateTable
CREATE TABLE "slot_templates" (
    "id" UUID NOT NULL,
    "hub_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "slot_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "slot_templates_hub_id_weekday_start_minute_key" ON "slot_templates"("hub_id", "weekday", "start_minute");

-- AddForeignKey
ALTER TABLE "slot_templates" ADD CONSTRAINT "slot_templates_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Hand-added: a window inside one day, with room for Orders.
ALTER TABLE "slot_templates" ADD CONSTRAINT "slot_templates_window_check" CHECK ("weekday" BETWEEN 0 AND 6 AND "start_minute" >= 0 AND "end_minute" <= 1440 AND "start_minute" < "end_minute" AND "capacity" >= 0);
