using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Grind.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class CevrimdisiIstemciAnahtari : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SetEntries_WorkoutSessionId",
                table: "SetEntries");

            migrationBuilder.AddColumn<Guid>(
                name: "ClientRequestId",
                table: "WorkoutSessions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ClientRequestId",
                table: "SetEntries",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutSessions_UserId_ClientRequestId",
                table: "WorkoutSessions",
                columns: new[] { "UserId", "ClientRequestId" },
                unique: true,
                filter: "\"ClientRequestId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_SetEntries_WorkoutSessionId_ClientRequestId",
                table: "SetEntries",
                columns: new[] { "WorkoutSessionId", "ClientRequestId" },
                unique: true,
                filter: "\"ClientRequestId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WorkoutSessions_UserId_ClientRequestId",
                table: "WorkoutSessions");

            migrationBuilder.DropIndex(
                name: "IX_SetEntries_WorkoutSessionId_ClientRequestId",
                table: "SetEntries");

            migrationBuilder.DropColumn(
                name: "ClientRequestId",
                table: "WorkoutSessions");

            migrationBuilder.DropColumn(
                name: "ClientRequestId",
                table: "SetEntries");

            migrationBuilder.CreateIndex(
                name: "IX_SetEntries_WorkoutSessionId",
                table: "SetEntries",
                column: "WorkoutSessionId");
        }
    }
}
